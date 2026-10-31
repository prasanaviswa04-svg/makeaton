from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.models import (
    Subscription, SubscriptionLine, Invoice, InvoiceLine,
    TaxRule, DiscountRule, ActivityLog, SubscriptionPlan
)
from backend.services.discount_service import DiscountService

class BillingService:
    @staticmethod
    def calculate_next_date(current_date: date, frequency: str) -> date:
        freq = frequency.lower()
        if freq == "daily":
            return current_date + timedelta(days=1)
        elif freq == "weekly":
            return current_date + timedelta(weeks=1)
        elif freq == "monthly":
            return current_date + relativedelta(months=1)
        elif freq == "yearly":
            return current_date + relativedelta(years=1)
        return current_date + relativedelta(months=1)

    @staticmethod
    def calculate_due_date(issue_date: date, payment_terms: str) -> date:
        terms = (payment_terms or "").lower().strip()
        if "15" in terms:
            return issue_date + timedelta(days=15)
        elif "30" in terms:
            return issue_date + timedelta(days=30)
        elif "60" in terms:
            return issue_date + timedelta(days=60)
        elif "7" in terms:
            return issue_date + timedelta(days=7)
        # Default immediate or net 0
        return issue_date

    @staticmethod
    def generate_invoice_number(db: Session) -> str:
        current_year = date.today().year
        prefix = f"INV-{current_year}-"
        
        # Get count of invoices for current year
        last_invoice = db.query(Invoice).filter(Invoice.invoice_number.like(f"{prefix}%"))\
            .order_by(Invoice.id.desc()).first()
        
        if last_invoice:
            try:
                last_seq = int(last_invoice.invoice_number.split("-")[-1])
                new_seq = last_seq + 1
            except ValueError:
                new_seq = db.query(Invoice).count() + 1
        else:
            new_seq = 1
        
        return f"{prefix}{new_seq:04d}"

    @staticmethod
    def create_invoice_for_subscription(
        db: Session,
        subscription: Subscription,
        run_date: Optional[date] = None,
        auto_confirm: bool = False
    ) -> Optional[Invoice]:
        target_date = run_date or date.today()
        period_start = subscription.next_billing_date or target_date
        period_end = BillingService.calculate_next_date(period_start, subscription.plan.billing_frequency)

        # Idempotency check: "Nothing should be billed twice or skipped"
        existing = db.query(Invoice).filter(
            Invoice.subscription_id == subscription.id,
            Invoice.billing_period_start == period_start,
            Invoice.status != "cancelled"
        ).first()

        if existing:
            return None  # Already billed for this period

        # Check default tax rule if not specified on lines
        default_tax = db.query(TaxRule).filter(TaxRule.is_default == True, TaxRule.is_active == True).first()

        subtotal = 0.0
        total_tax = 0.0
        invoice_lines_to_add = []
        total_qty = 0

        for s_line in subscription.lines:
            line_subtotal = s_line.quantity * s_line.unit_price
            subtotal += line_subtotal
            total_qty += s_line.quantity

            # Tax rate lookup
            tax_rate = 0.0
            if s_line.tax and s_line.tax.is_active:
                tax_rate = s_line.tax.rate_percent
            elif default_tax:
                tax_rate = default_tax.rate_percent

            line_tax = round((line_subtotal * tax_rate) / 100.0, 2)
            total_tax += line_tax

            desc = f"{s_line.product.name}"
            if s_line.variant:
                desc += f" ({s_line.variant.attribute_name}: {s_line.variant.attribute_value})"

            inv_line = InvoiceLine(
                product_id=s_line.product_id,
                variant_id=s_line.variant_id,
                description=desc,
                quantity=s_line.quantity,
                unit_price=s_line.unit_price,
                tax_rate=tax_rate,
                tax_amount=line_tax,
                discount_amount=0.0,
                total_amount=round(line_subtotal + line_tax, 2)
            )
            invoice_lines_to_add.append(inv_line)

        # Evaluate Discounts
        total_discount = 0.0
        if subscription.applied_discount_id:
            discount_rule = db.query(DiscountRule).filter(DiscountRule.id == subscription.applied_discount_id).first()
            if discount_rule:
                total_discount = DiscountService.calculate_discount_for_subscription(
                    discount=discount_rule,
                    subtotal=subtotal,
                    total_quantity=total_qty,
                    lines_data=subscription.lines,
                    check_date=target_date
                )
                if total_discount > 0:
                    DiscountService.record_discount_usage(db, discount_rule.id)

        # Final invoice total calculation
        total_amount = max(0.0, round(subtotal + total_tax - total_discount, 2))
        due_date = BillingService.calculate_due_date(target_date, subscription.payment_terms)

        inv_status = "confirmed" if auto_confirm else "draft"

        invoice = Invoice(
            invoice_number=BillingService.generate_invoice_number(db),
            subscription_id=subscription.id,
            customer_id=subscription.customer_id,
            issue_date=target_date,
            due_date=due_date,
            billing_period_start=period_start,
            billing_period_end=period_end,
            status=inv_status,
            subtotal=round(subtotal, 2),
            tax_amount=round(total_tax, 2),
            discount_amount=round(total_discount, 2),
            total_amount=total_amount,
            amount_paid=0.0,
            amount_due=total_amount,
            notes=f"Recurring billing for {subscription.sub_number} ({subscription.plan.name})"
        )

        db.add(invoice)
        db.flush()

        for line in invoice_lines_to_add:
            line.invoice_id = invoice.id
            db.add(line)

        # Update Subscription Next Billing Date
        next_date = period_end
        subscription.next_billing_date = next_date

        # Check Auto-Close Policy
        if subscription.auto_close_on_end and subscription.expiry_date:
            if next_date > subscription.expiry_date:
                subscription.status = "closed"
                log_close = ActivityLog(
                    action="SUBSCRIPTION_AUTO_CLOSED",
                    entity_type="subscription",
                    entity_id=subscription.id,
                    details=f"Subscription {subscription.sub_number} auto-closed as expiry date {subscription.expiry_date} was reached."
                )
                db.add(log_close)

        log = ActivityLog(
            action="INVOICE_GENERATED",
            entity_type="invoice",
            entity_id=invoice.id,
            details=f"Invoice {invoice.invoice_number} generated for {subscription.sub_number}. Amount: ${total_amount:,.2f}"
        )
        db.add(log)

        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def run_billing_day(
        db: Session,
        target_date: Optional[date] = None,
        auto_confirm: bool = False
    ) -> dict:
        """
        Billing Day Batch Run:
        Scans all active subscriptions due on or before target_date and generates invoices automatically.
        """
        run_date = target_date or date.today()
        
        due_subscriptions = db.query(Subscription).filter(
            Subscription.status == "active",
            Subscription.next_billing_date <= run_date
        ).all()

        generated_invoices = []
        skipped_count = 0
        total_billed = 0.0

        for sub in due_subscriptions:
            invoice = BillingService.create_invoice_for_subscription(
                db=db,
                subscription=sub,
                run_date=run_date,
                auto_confirm=auto_confirm
            )
            if invoice:
                generated_invoices.append(invoice)
                total_billed += invoice.total_amount
            else:
                skipped_count += 1

        return {
            "run_date": str(run_date),
            "subscriptions_evaluated": len(due_subscriptions),
            "invoices_generated": len(generated_invoices),
            "skipped_already_billed": skipped_count,
            "total_billed_amount": round(total_billed, 2),
            "invoice_ids": [inv.id for inv in generated_invoices]
        }
