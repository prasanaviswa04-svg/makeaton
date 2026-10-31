from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import (
    User, Subscription, Invoice, Payment, ActivityLog
)
from backend.auth import require_customer, get_current_user
from backend.schemas import SubscriptionOut, InvoiceOut, PaymentOut, PaymentCreate
from backend.services.billing_service import BillingService
from backend.services.pdf_service import PDFService
from backend.routers.payments_router import generate_payment_number

router = APIRouter(prefix="/api/portal", tags=["Customer Self-Service Portal"])

@router.get("/my-subscriptions", response_model=List[SubscriptionOut])
def get_my_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Enforces isolation: customers see only their own subscriptions
    return db.query(Subscription).filter(Subscription.customer_id == current_user.id)\
        .order_by(Subscription.id.desc()).all()

@router.get("/my-invoices", response_model=List[InvoiceOut])
def get_my_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Enforces isolation: customers see only their own invoices
    today = date.today()
    invoices = db.query(Invoice).filter(Invoice.customer_id == current_user.id)\
        .order_by(Invoice.id.desc()).all()
    for inv in invoices:
        inv.is_overdue = (inv.due_date < today and inv.status != "paid" and inv.status != "cancelled" and inv.amount_due > 0)
    return invoices

@router.post("/subscription/{sub_id}/pause", response_model=SubscriptionOut)
def portal_pause_subscription(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(
        Subscription.id == sub_id,
        Subscription.customer_id == current_user.id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if not sub.allow_pause:
        raise HTTPException(status_code=400, detail="This plan cannot be paused per company policy.")

    if sub.status != "active":
        raise HTTPException(status_code=400, detail=f"Cannot pause a subscription that is currently '{sub.status}'.")

    sub.status = "paused"
    db.commit()
    db.refresh(sub)

    log = ActivityLog(
        user_id=current_user.id,
        action="PORTAL_SUBSCRIPTION_PAUSED",
        entity_type="subscription",
        entity_id=sub.id,
        details=f"Customer {current_user.full_name} paused subscription {sub.sub_number} self-service."
    )
    db.add(log)
    db.commit()

    return sub

@router.post("/subscription/{sub_id}/resume", response_model=SubscriptionOut)
def portal_resume_subscription(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(
        Subscription.id == sub_id,
        Subscription.customer_id == current_user.id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if sub.status != "paused":
        raise HTTPException(status_code=400, detail="Only paused subscriptions can be resumed.")

    sub.status = "active"
    if not sub.next_billing_date or sub.next_billing_date < date.today():
        sub.next_billing_date = date.today()

    db.commit()
    db.refresh(sub)

    log = ActivityLog(
        user_id=current_user.id,
        action="PORTAL_SUBSCRIPTION_RESUMED",
        entity_type="subscription",
        entity_id=sub.id,
        details=f"Customer {current_user.full_name} resumed subscription {sub.sub_number}."
    )
    db.add(log)
    db.commit()

    return sub

@router.post("/subscription/{sub_id}/cancel", response_model=SubscriptionOut)
def portal_cancel_subscription(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(
        Subscription.id == sub_id,
        Subscription.customer_id == current_user.id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if not sub.allow_early_close:
        raise HTTPException(status_code=400, detail="Early cancellation is not allowed for this plan.")

    sub.status = "closed"
    db.commit()
    db.refresh(sub)

    log = ActivityLog(
        user_id=current_user.id,
        action="PORTAL_SUBSCRIPTION_CANCELLED",
        entity_type="subscription",
        entity_id=sub.id,
        details=f"Customer {current_user.full_name} cancelled subscription {sub.sub_number}."
    )
    db.add(log)
    db.commit()

    return sub

@router.post("/subscription/{sub_id}/renew", response_model=SubscriptionOut)
def portal_renew_subscription(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(
        Subscription.id == sub_id,
        Subscription.customer_id == current_user.id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if not sub.allow_renewal:
        raise HTTPException(status_code=400, detail="Renewals are disabled for this plan.")

    base_date = sub.expiry_date or date.today()
    new_expiry = BillingService.calculate_next_date(base_date, sub.plan.billing_frequency)
    sub.expiry_date = new_expiry
    if sub.status in ["closed", "paused"]:
        sub.status = "active"
        if not sub.next_billing_date or sub.next_billing_date < date.today():
            sub.next_billing_date = date.today()

    db.commit()
    db.refresh(sub)

    log = ActivityLog(
        user_id=current_user.id,
        action="PORTAL_SUBSCRIPTION_RENEWED",
        entity_type="subscription",
        entity_id=sub.id,
        details=f"Customer {current_user.full_name} renewed subscription {sub.sub_number} until {new_expiry}."
    )
    db.add(log)
    db.commit()

    return sub

@router.post("/invoice/{invoice_id}/pay", response_model=PaymentOut)
def portal_pay_invoice(
    invoice_id: int,
    payment_method: str = "Credit Card",
    reference_note: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.customer_id == current_user.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if inv.status == "paid" or inv.amount_due <= 0:
        raise HTTPException(status_code=400, detail="This invoice is already settled.")

    amount_to_pay = inv.amount_due

    payment = Payment(
        payment_number=generate_payment_number(db),
        invoice_id=inv.id,
        customer_id=current_user.id,
        amount=amount_to_pay,
        payment_method=payment_method,
        payment_date=date.today(),
        reference_note=reference_note or f"Customer online payment via {payment_method}"
    )
    db.add(payment)

    inv.amount_paid = round(inv.amount_paid + amount_to_pay, 2)
    inv.amount_due = 0.0
    inv.status = "paid"

    log = ActivityLog(
        user_id=current_user.id,
        action="PORTAL_PAYMENT_SUCCESS",
        entity_type="payment",
        entity_id=payment.id,
        details=f"Customer {current_user.full_name} paid ${amount_to_pay:,.2f} for invoice {inv.invoice_number} via {payment_method}."
    )
    db.add(log)

    db.commit()
    db.refresh(payment)
    return payment

@router.get("/invoice/{invoice_id}/pdf")
def portal_download_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.customer_id == current_user.id
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    pdf_bytes = PDFService.generate_invoice_pdf(inv)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{inv.invoice_number}.pdf"'
        }
    )
