from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Payment, Invoice, User, ActivityLog
from backend.auth import require_staff_or_admin
from backend.schemas import PaymentOut, PaymentCreate

router = APIRouter(prefix="/api/payments", tags=["Payments"])

def generate_payment_number(db: Session) -> str:
    current_year = date.today().year
    prefix = f"PAY-{current_year}-"
    last_pay = db.query(Payment).filter(Payment.payment_number.like(f"{prefix}%"))\
        .order_by(Payment.id.desc()).first()
    if last_pay:
        try:
            last_seq = int(last_pay.payment_number.split("-")[-1])
            new_seq = last_seq + 1
        except ValueError:
            new_seq = db.query(Payment).count() + 1
    else:
        new_seq = 1
    return f"{prefix}{new_seq:04d}"

@router.get("", response_model=List[PaymentOut])
def list_payments(
    invoice_id: Optional[int] = None,
    customer_id: Optional[int] = None,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Payment)
    if invoice_id:
        query = query.filter(Payment.invoice_id == invoice_id)
    if customer_id:
        query = query.filter(Payment.customer_id == customer_id)
    return query.order_by(Payment.id.desc()).all()

@router.post("", response_model=PaymentOut)
def record_payment(
    payload: PaymentCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(Invoice.id == payload.invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if inv.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot record payments for cancelled invoices.")

    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    if payload.amount > (inv.amount_due + 0.01):
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount (${payload.amount:.2f}) exceeds outstanding invoice amount due (${inv.amount_due:.2f})."
        )

    pay_date = payload.payment_date or date.today()

    payment = Payment(
        payment_number=generate_payment_number(db),
        invoice_id=inv.id,
        customer_id=inv.customer_id,
        amount=round(payload.amount, 2),
        payment_method=payload.payment_method,
        payment_date=pay_date,
        reference_note=payload.reference_note
    )
    db.add(payment)

    # Update invoice paid balance
    inv.amount_paid = round(inv.amount_paid + payload.amount, 2)
    inv.amount_due = max(0.0, round(inv.total_amount - inv.amount_paid, 2))

    if inv.amount_due <= 0.001:
        inv.status = "paid"
    elif inv.status == "draft":
        inv.status = "confirmed"

    log = ActivityLog(
        user_id=current_user.id,
        action="PAYMENT_RECORDED",
        entity_type="payment",
        entity_id=payment.id,
        details=f"Payment {payment.payment_number} of ${payment.amount:,.2f} recorded via {payment.payment_method} against {inv.invoice_number} by {current_user.full_name}."
    )
    db.add(log)

    db.commit()
    db.refresh(payment)
    return payment

@router.get("/methods")
def get_payment_methods():
    return [
        {"id": "credit_card", "name": "Credit Card (Visa / Mastercard)"},
        {"id": "bank_transfer", "name": "Bank Transfer / ACH"},
        {"id": "stripe", "name": "Stripe Direct"},
        {"id": "upi", "name": "UPI / Instant Wire"},
        {"id": "cheque", "name": "Cheque / Corporate Draft"},
        {"id": "cash", "name": "Cash"}
    ]
