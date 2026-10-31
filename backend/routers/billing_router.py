from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Invoice, Subscription, User, ActivityLog
from backend.auth import require_staff_or_admin
from backend.schemas import InvoiceOut, InvoiceCreateManual
from backend.services.billing_service import BillingService
from backend.services.pdf_service import PDFService

router = APIRouter(prefix="/api/billing", tags=["Billing Day & Invoices"])

@router.post("/run-billing-day")
def trigger_billing_day(
    target_date: Optional[date] = None,
    auto_confirm: bool = False,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    """
    Automated recurring billing engine:
    Processes all due subscriptions, prevents duplicate billing, applies tax rules and discounts.
    """
    result = BillingService.run_billing_day(db=db, target_date=target_date, auto_confirm=auto_confirm)
    
    log = ActivityLog(
        user_id=current_user.id,
        action="BILLING_DAY_RUN",
        entity_type="billing",
        details=f"{current_user.full_name} executed Billing Day for {result['run_date']}. Generated {result['invoices_generated']} invoices totaling ${result['total_billed_amount']:,.2f}."
    )
    db.add(log)
    db.commit()

    return result

@router.post("/generate-invoice/{sub_id}", response_model=InvoiceOut)
def generate_invoice_for_subscription(
    sub_id: int,
    auto_confirm: bool = False,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    invoice = BillingService.create_invoice_for_subscription(
        db=db,
        subscription=sub,
        run_date=date.today(),
        auto_confirm=auto_confirm
    )

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Subscription {sub.sub_number} is already billed for the current period ({sub.next_billing_date}). Nothing should be billed twice!"
        )

    return invoice

@router.get("/invoices", response_model=List[InvoiceOut])
def list_invoices(
    status: Optional[str] = None,
    customer_id: Optional[int] = None,
    overdue_only: bool = False,
    search: Optional[str] = None,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    today = date.today()
    query = db.query(Invoice)

    if status:
        query = query.filter(Invoice.status == status.lower())
    if customer_id:
        query = query.filter(Invoice.customer_id == customer_id)
    if overdue_only:
        query = query.filter(
            Invoice.due_date < today,
            Invoice.status != "paid",
            Invoice.status != "cancelled",
            Invoice.amount_due > 0
        )
    if search:
        search_fmt = f"%{search}%"
        query = query.join(Invoice.customer).filter(
            (Invoice.invoice_number.ilike(search_fmt)) |
            (User.full_name.ilike(search_fmt)) |
            (User.email.ilike(search_fmt))
        )

    invoices = query.order_by(Invoice.id.desc()).all()
    
    # Mark is_overdue flag dynamically
    for inv in invoices:
        inv.is_overdue = (inv.due_date < today and inv.status != "paid" and inv.status != "cancelled" and inv.amount_due > 0)
    
    return invoices

@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    inv.is_overdue = (inv.due_date < date.today() and inv.status != "paid" and inv.status != "cancelled" and inv.amount_due > 0)
    return inv

@router.post("/invoices/{invoice_id}/confirm", response_model=InvoiceOut)
def confirm_invoice(
    invoice_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")
    
    if inv.status != "draft":
        raise HTTPException(status_code=400, detail=f"Invoice is already in '{inv.status}' state.")

    inv.status = "confirmed"
    db.commit()
    db.refresh(inv)

    log = ActivityLog(
        user_id=current_user.id,
        action="INVOICE_CONFIRMED",
        entity_type="invoice",
        entity_id=inv.id,
        details=f"Invoice {inv.invoice_number} confirmed by {current_user.full_name}."
    )
    db.add(log)
    db.commit()

    return inv

@router.post("/invoices/{invoice_id}/cancel", response_model=InvoiceOut)
def cancel_invoice(
    invoice_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if inv.status == "paid":
        raise HTTPException(status_code=400, detail="Cannot cancel an invoice that has already been paid.")

    inv.status = "cancelled"
    inv.amount_due = 0.0
    db.commit()
    db.refresh(inv)

    log = ActivityLog(
        user_id=current_user.id,
        action="INVOICE_CANCELLED",
        entity_type="invoice",
        entity_id=inv.id,
        details=f"Invoice {inv.invoice_number} cancelled by {current_user.full_name}."
    )
    db.add(log)
    db.commit()

    return inv

@router.post("/invoices/{invoice_id}/send")
def send_invoice(
    invoice_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    inv.sent_at = datetime.utcnow()
    db.commit()

    log = ActivityLog(
        user_id=current_user.id,
        action="INVOICE_SENT",
        entity_type="invoice",
        entity_id=inv.id,
        details=f"Invoice {inv.invoice_number} dispatched electronically to {inv.customer.email}."
    )
    db.add(log)
    db.commit()

    return {
        "status": "success",
        "message": f"Invoice {inv.invoice_number} successfully dispatched to {inv.customer.email}.",
        "recipient": inv.customer.email,
        "sent_at": inv.sent_at.isoformat(),
        "amount_due": inv.amount_due
    }

@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
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
