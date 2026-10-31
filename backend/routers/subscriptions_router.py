from datetime import date, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import (
    Subscription, SubscriptionLine, SubscriptionPlan, Product, ProductVariant,
    TaxRule, DiscountRule, QuotationTemplate, User, ActivityLog
)
from backend.auth import require_staff_or_admin
from backend.schemas import SubscriptionOut, SubscriptionCreate, SubscriptionUpdate
from backend.services.billing_service import BillingService

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions & Lifecycle"])

def generate_sub_number(db: Session) -> str:
    current_year = date.today().year
    prefix = f"SUB-{current_year}-"
    last_sub = db.query(Subscription).filter(Subscription.sub_number.like(f"{prefix}%"))\
        .order_by(Subscription.id.desc()).first()
    if last_sub:
        try:
            last_seq = int(last_sub.sub_number.split("-")[-1])
            new_seq = last_seq + 1
        except ValueError:
            new_seq = db.query(Subscription).count() + 1
    else:
        new_seq = 1
    return f"{prefix}{new_seq:04d}"

@router.get("", response_model=List[SubscriptionOut])
def list_subscriptions(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    plan_id: Optional[int] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Subscription)
    if status:
        query = query.filter(Subscription.status == status.lower())
    if customer_id:
        query = query.filter(Subscription.customer_id == customer_id)
    if plan_id:
        query = query.filter(Subscription.plan_id == plan_id)
    if search:
        search_fmt = f"%{search}%"
        query = query.join(Subscription.customer).filter(
            (Subscription.sub_number.ilike(search_fmt)) |
            (User.full_name.ilike(search_fmt)) |
            (User.email.ilike(search_fmt))
        )
    return query.order_by(Subscription.id.desc()).all()

@router.get("/{sub_id}", response_model=SubscriptionOut)
def get_subscription(
    sub_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")
    return sub

@router.post("", response_model=SubscriptionOut)
def create_subscription(
    payload: SubscriptionCreate,
    initial_status: str = "draft",  # draft, quotation, confirmed, active
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    customer = db.query(User).filter(User.id == payload.customer_id, User.role == "customer").first()
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found.")

    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == payload.plan_id).first()
    if not plan:
        raise HTTPException(status_code=400, detail="Plan not found.")

    start = payload.start_date or date.today()
    default_tax = db.query(TaxRule).filter(TaxRule.is_default == True, TaxRule.is_active == True).first()

    sub = Subscription(
        sub_number=generate_sub_number(db),
        customer_id=customer.id,
        plan_id=plan.id,
        template_id=payload.template_id,
        status=initial_status.lower(),
        start_date=start,
        expiry_date=payload.expiry_date,
        next_billing_date=start if initial_status.lower() == "active" else None,
        payment_terms=payload.payment_terms or "Immediate",
        auto_close_on_end=plan.auto_close_on_end,
        allow_early_close=plan.allow_early_close,
        allow_pause=plan.allow_pause,
        allow_renewal=plan.allow_renewal,
        applied_discount_id=payload.applied_discount_id,
        notes=payload.notes
    )
    db.add(sub)
    db.flush()

    # Add lines
    for line_in in payload.lines:
        prod = db.query(Product).filter(Product.id == line_in.product_id).first()
        if not prod:
            continue
        
        variant = None
        price_extra = 0.0
        if line_in.variant_id:
            variant = db.query(ProductVariant).filter(ProductVariant.id == line_in.variant_id).first()
            if variant:
                price_extra = variant.price_extra

        # Determine unit price
        unit_price = line_in.unit_price if line_in.unit_price is not None else (prod.sales_price + price_extra)
        subtotal = round(unit_price * line_in.quantity, 2)

        # Tax
        tax_rule = None
        tax_rate = 0.0
        if line_in.tax_id:
            tax_rule = db.query(TaxRule).filter(TaxRule.id == line_in.tax_id).first()
        elif default_tax:
            tax_rule = default_tax

        if tax_rule:
            tax_rate = tax_rule.rate_percent

        tax_amount = round((subtotal * tax_rate) / 100.0, 2)
        total_amount = round(subtotal + tax_amount - line_in.discount_amount, 2)

        s_line = SubscriptionLine(
            subscription_id=sub.id,
            product_id=prod.id,
            variant_id=variant.id if variant else None,
            quantity=line_in.quantity,
            unit_price=unit_price,
            tax_id=tax_rule.id if tax_rule else None,
            discount_amount=line_in.discount_amount,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount
        )
        db.add(s_line)

    db.commit()
    db.refresh(sub)

    log = ActivityLog(
        user_id=current_user.id,
        action="SUBSCRIPTION_CREATED",
        entity_type="subscription",
        entity_id=sub.id,
        details=f"{current_user.full_name} created subscription {sub.sub_number} for {customer.full_name} in state '{sub.status}'."
    )
    db.add(log)
    db.commit()

    return sub

@router.post("/from-template/{template_id}", response_model=SubscriptionOut)
def create_from_quotation_template(
    template_id: int,
    customer_id: int,
    payment_terms: str = "Immediate",
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    """
    Turning a quote into a subscription:
    'A sales rep is preparing an offer for a large customer. Instead of building it from scratch,
    they start from a quotation template that already has the right plan and product lines,
    and stays valid for a set number of days.'
    """
    template = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Quotation template not found.")

    customer = db.query(User).filter(User.id == customer_id, User.role == "customer").first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    today = date.today()
    expiry = today + timedelta(days=template.validity_days)

    default_tax = db.query(TaxRule).filter(TaxRule.is_default == True, TaxRule.is_active == True).first()

    sub = Subscription(
        sub_number=generate_sub_number(db),
        customer_id=customer.id,
        plan_id=template.plan_id,
        template_id=template.id,
        status="quotation",  # Starts in Quotation state
        start_date=today,
        expiry_date=expiry,
        next_billing_date=None,
        payment_terms=payment_terms,
        auto_close_on_end=template.plan.auto_close_on_end,
        allow_early_close=template.plan.allow_early_close,
        allow_pause=template.plan.allow_pause,
        allow_renewal=template.plan.allow_renewal,
        notes=f"Generated from template: {template.name} (Valid until {expiry})"
    )
    db.add(sub)
    db.flush()

    for t_line in template.lines:
        prod = t_line.product
        variant = t_line.variant
        price_extra = variant.price_extra if variant else 0.0
        unit_price = t_line.unit_price or (prod.sales_price + price_extra)
        subtotal = round(unit_price * t_line.quantity, 2)

        disc_amount = 0.0
        if t_line.discount_percent > 0:
            disc_amount = round((subtotal * t_line.discount_percent) / 100.0, 2)

        tax_rate = default_tax.rate_percent if default_tax else 0.0
        tax_amount = round(((subtotal - disc_amount) * tax_rate) / 100.0, 2)
        total_amount = round(subtotal - disc_amount + tax_amount, 2)

        s_line = SubscriptionLine(
            subscription_id=sub.id,
            product_id=t_line.product_id,
            variant_id=t_line.variant_id,
            quantity=t_line.quantity,
            unit_price=unit_price,
            tax_id=default_tax.id if default_tax else None,
            discount_amount=disc_amount,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount
        )
        db.add(s_line)

    db.commit()
    db.refresh(sub)

    log = ActivityLog(
        user_id=current_user.id,
        action="QUOTE_GENERATED",
        entity_type="subscription",
        entity_id=sub.id,
        details=f"Sales rep {current_user.email} prepared quote {sub.sub_number} for {customer.full_name} from template '{template.name}'."
    )
    db.add(log)
    db.commit()

    return sub

@router.post("/{sub_id}/status/{new_status}", response_model=SubscriptionOut)
def update_subscription_status(
    sub_id: int,
    new_status: str,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    valid_statuses = ["draft", "quotation", "confirmed", "active", "paused", "closed"]
    target = new_status.lower()
    if target not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {', '.join(valid_statuses)}")

    # Check lifecycle permissions
    if target == "paused" and not sub.allow_pause:
        raise HTTPException(status_code=400, detail="Pausing is not allowed by this plan's policies.")
    if target == "closed" and sub.status == "active" and not sub.allow_early_close:
        raise HTTPException(status_code=400, detail="Early closing is not allowed by this plan's policies.")

    old_status = sub.status
    sub.status = target

    if target == "active" and not sub.next_billing_date:
        sub.next_billing_date = sub.start_date or date.today()

    db.commit()
    db.refresh(sub)

    log = ActivityLog(
        user_id=current_user.id,
        action="SUBSCRIPTION_STATUS_CHANGED",
        entity_type="subscription",
        entity_id=sub.id,
        details=f"Status of {sub.sub_number} changed from '{old_status}' to '{target}' by {current_user.full_name}."
    )
    db.add(log)
    db.commit()

    return sub

@router.post("/{sub_id}/renew", response_model=SubscriptionOut)
def renew_subscription(
    sub_id: int,
    extension_periods: int = 1,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if not sub.allow_renewal:
        raise HTTPException(status_code=400, detail="Renewals are disabled for this subscription's plan.")

    base_date = sub.expiry_date or date.today()
    new_expiry = base_date
    for _ in range(extension_periods):
        new_expiry = BillingService.calculate_next_date(new_expiry, sub.plan.billing_frequency)

    sub.expiry_date = new_expiry
    if sub.status in ["closed", "paused"]:
        sub.status = "active"
        if not sub.next_billing_date or sub.next_billing_date < date.today():
            sub.next_billing_date = date.today()

    db.commit()
    db.refresh(sub)

    log = ActivityLog(
        user_id=current_user.id,
        action="SUBSCRIPTION_RENEWED",
        entity_type="subscription",
        entity_id=sub.id,
        details=f"Subscription {sub.sub_number} renewed until {new_expiry}."
    )
    db.add(log)
    db.commit()

    return sub
