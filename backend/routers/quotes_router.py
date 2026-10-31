from datetime import date, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import (
    QuotationTemplate, QuotationTemplateLine, Subscription, SubscriptionLine,
    SubscriptionPlan, Product, ProductVariant, TaxRule, User, ActivityLog
)
from backend.auth import require_staff_or_admin
from backend.schemas import (
    QuotationTemplateCreate, QuotationTemplateOut, SubscriptionOut
)

router = APIRouter(prefix="/api/quotes", tags=["Quotation Templates"])

@router.get("/templates", response_model=List[QuotationTemplateOut])
def list_quotation_templates(
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    return db.query(QuotationTemplate).order_by(QuotationTemplate.name.asc()).all()

@router.get("/templates/{template_id}", response_model=QuotationTemplateOut)
def get_quotation_template(
    template_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    t = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Quotation template not found.")
    return t

@router.post("/templates", response_model=QuotationTemplateOut)
def create_quotation_template(
    payload: QuotationTemplateCreate,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == payload.plan_id).first()
    if not plan:
        raise HTTPException(status_code=400, detail="Specified subscription plan does not exist.")

    template = QuotationTemplate(
        name=payload.name,
        plan_id=payload.plan_id,
        validity_days=payload.validity_days,
        notes=payload.notes
    )
    db.add(template)
    db.flush()

    for line_in in payload.lines:
        prod = db.query(Product).filter(Product.id == line_in.product_id).first()
        if not prod:
            continue
        qline = QuotationTemplateLine(
            template_id=template.id,
            product_id=line_in.product_id,
            variant_id=line_in.variant_id,
            quantity=line_in.quantity,
            unit_price=line_in.unit_price,
            discount_percent=line_in.discount_percent
        )
        db.add(qline)

    db.commit()
    db.refresh(template)

    log = ActivityLog(
        user_id=current_user.id,
        action="QUOTATION_TEMPLATE_CREATED",
        entity_type="quotation_template",
        entity_id=template.id,
        details=f"Sales rep {current_user.email} created quotation template '{template.name}' ({template.validity_days} days validity)."
    )
    db.add(log)
    db.commit()

    return template

@router.delete("/templates/{template_id}")
def delete_quotation_template(
    template_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    t = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found.")
    db.delete(t)
    db.commit()
    return {"message": "Quotation template deleted successfully."}
