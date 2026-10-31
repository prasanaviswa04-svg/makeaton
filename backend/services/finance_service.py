import time
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_

from backend.models import Subscription, SubscriptionPlan, Invoice, Payment, User, SubscriptionLine

class FinanceService:
    @staticmethod
    def get_dashboard_metrics(
        db: Session,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        customer_id: Optional[int] = None,
        plan_id: Optional[int] = None
    ) -> Dict[str, Any]:
        start_time = time.perf_counter()
        today = date.today()

        # Base filter queries
        sub_query = db.query(Subscription)
        inv_query = db.query(Invoice)
        pay_query = db.query(Payment)

        if customer_id:
            sub_query = sub_query.filter(Subscription.customer_id == customer_id)
            inv_query = inv_query.filter(Invoice.customer_id == customer_id)
            pay_query = pay_query.filter(Payment.customer_id == customer_id)

        if plan_id:
            sub_query = sub_query.filter(Subscription.plan_id == plan_id)

        # 1. Subscription Counts
        total_subs = sub_query.count()
        active_subs = sub_query.filter(Subscription.status == "active").count()
        paused_subs = sub_query.filter(Subscription.status == "paused").count()
        closed_subs = sub_query.filter(Subscription.status == "closed").count()
        draft_subs = sub_query.filter(Subscription.status == "draft").count()
        quote_subs = sub_query.filter(Subscription.status == "quotation").count()

        # 2. MRR & ARR calculation from active subscriptions
        # Efficiently calculate based on active subscriptions lines & plans
        active_subscriptions = sub_query.filter(Subscription.status == "active").all()
        mrr = 0.0
        for sub in active_subscriptions:
            # Calculate subscription total value per period
            sub_period_total = sum(line.total_amount for line in sub.lines)
            freq = sub.plan.billing_frequency.lower() if sub.plan else "monthly"
            
            if freq == "daily":
                normalized_monthly = sub_period_total * 30.0
            elif freq == "weekly":
                normalized_monthly = sub_period_total * 4.333
            elif freq == "monthly":
                normalized_monthly = sub_period_total
            elif freq == "yearly":
                normalized_monthly = sub_period_total / 12.0
            else:
                normalized_monthly = sub_period_total
            mrr += normalized_monthly

        mrr = round(mrr, 2)
        arr = round(mrr * 12.0, 2)

        # 3. Revenue & Receivables
        # Total revenue collected (all recorded payments)
        if start_date:
            pay_query = pay_query.filter(Payment.payment_date >= start_date)
            inv_query = inv_query.filter(Invoice.issue_date >= start_date)
        if end_date:
            pay_query = pay_query.filter(Payment.payment_date <= end_date)
            inv_query = inv_query.filter(Invoice.issue_date <= end_date)

        total_collected = pay_query.with_entities(func.coalesce(func.sum(Payment.amount), 0.0)).scalar() or 0.0

        # Outstanding owed (invoices confirmed and amount_due > 0)
        outstanding_metrics = inv_query.filter(
            Invoice.status.in_(["confirmed", "draft"]),
            Invoice.amount_due > 0
        ).with_entities(
            func.coalesce(func.sum(Invoice.amount_due), 0.0),
            func.count(Invoice.id)
        ).first()
        total_outstanding = outstanding_metrics[0] or 0.0

        # 4. Overdue Invoices
        overdue_invoices_query = inv_query.filter(
            Invoice.due_date < today,
            Invoice.status != "paid",
            Invoice.status != "cancelled",
            Invoice.amount_due > 0
        )
        overdue_count = overdue_invoices_query.count()
        overdue_amount = overdue_invoices_query.with_entities(
            func.coalesce(func.sum(Invoice.amount_due), 0.0)
        ).scalar() or 0.0

        # 5. Overdue Aging Breakdown
        # 0-30 days, 31-60 days, 61-90 days, 90+ days
        d30 = today - timedelta(days=30)
        d60 = today - timedelta(days=60)
        d90 = today - timedelta(days=90)

        aging_0_30 = inv_query.filter(
            Invoice.due_date < today,
            Invoice.due_date >= d30,
            Invoice.status != "paid",
            Invoice.status != "cancelled",
            Invoice.amount_due > 0
        ).with_entities(func.coalesce(func.sum(Invoice.amount_due), 0.0), func.count(Invoice.id)).first()

        aging_31_60 = inv_query.filter(
            Invoice.due_date < d30,
            Invoice.due_date >= d60,
            Invoice.status != "paid",
            Invoice.status != "cancelled",
            Invoice.amount_due > 0
        ).with_entities(func.coalesce(func.sum(Invoice.amount_due), 0.0), func.count(Invoice.id)).first()

        aging_61_90 = inv_query.filter(
            Invoice.due_date < d60,
            Invoice.due_date >= d90,
            Invoice.status != "paid",
            Invoice.status != "cancelled",
            Invoice.amount_due > 0
        ).with_entities(func.coalesce(func.sum(Invoice.amount_due), 0.0), func.count(Invoice.id)).first()

        aging_90_plus = inv_query.filter(
            Invoice.due_date < d90,
            Invoice.status != "paid",
            Invoice.status != "cancelled",
            Invoice.amount_due > 0
        ).with_entities(func.coalesce(func.sum(Invoice.amount_due), 0.0), func.count(Invoice.id)).first()

        # 6. Monthly trend (past 6 months)
        trends = []
        for i in range(5, -1, -1):
            m_start = (today.replace(day=1) - relativedelta(months=i))
            if m_start.month == 12:
                m_end = m_start.replace(year=m_start.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                m_end = m_start.replace(month=m_start.month + 1, day=1) - timedelta(days=1)
            
            m_label = m_start.strftime("%b %Y")
            m_rev = db.query(func.coalesce(func.sum(Payment.amount), 0.0)).filter(
                Payment.payment_date >= m_start,
                Payment.payment_date <= m_end
            ).scalar() or 0.0

            m_invoiced = db.query(func.coalesce(func.sum(Invoice.total_amount), 0.0)).filter(
                Invoice.issue_date >= m_start,
                Invoice.issue_date <= m_end,
                Invoice.status != "cancelled"
            ).scalar() or 0.0

            trends.append({
                "month": m_label,
                "revenue_collected": round(m_rev, 2),
                "invoiced_amount": round(m_invoiced, 2)
            })

        # Top overdue list for chasing
        top_overdue = overdue_invoices_query.order_by(Invoice.due_date.asc()).limit(10).all()
        overdue_list = []
        for inv in top_overdue:
            days_overdue = (today - inv.due_date).days
            overdue_list.append({
                "invoice_id": inv.id,
                "invoice_number": inv.invoice_number,
                "customer_name": inv.customer.full_name if inv.customer else "Unknown",
                "customer_email": inv.customer.email if inv.customer else "",
                "amount_due": inv.amount_due,
                "due_date": str(inv.due_date),
                "days_overdue": days_overdue
            })

        execution_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "summary": {
                "active_subscriptions": active_subs,
                "total_subscriptions": total_subs,
                "paused_subscriptions": paused_subs,
                "closed_subscriptions": closed_subs,
                "draft_subscriptions": draft_subs,
                "quotation_subscriptions": quote_subs,
                "mrr": mrr,
                "arr": arr,
                "total_revenue_collected": round(total_collected, 2),
                "total_outstanding_amount": round(total_outstanding, 2),
                "overdue_invoices_count": overdue_count,
                "overdue_invoices_amount": round(overdue_amount, 2)
            },
            "aging_buckets": {
                "0_30_days": {"amount": round(aging_0_30[0] or 0.0, 2), "count": aging_0_30[1]},
                "31_60_days": {"amount": round(aging_31_60[0] or 0.0, 2), "count": aging_31_60[1]},
                "61_90_days": {"amount": round(aging_61_90[0] or 0.0, 2), "count": aging_61_90[1]},
                "90_plus_days": {"amount": round(aging_90_plus[0] or 0.0, 2), "count": aging_90_plus[1]}
            },
            "monthly_trends": trends,
            "top_overdue": overdue_list,
            "performance": {
                "execution_ms": execution_ms,
                "sla_ms": 2000,
                "status": "PASSED" if execution_ms < 2000 else "EXCEEDED"
            }
        }
