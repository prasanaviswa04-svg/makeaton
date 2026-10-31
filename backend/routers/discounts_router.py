from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import DiscountRule, User, ActivityLog
from backend.auth import require_admin, require_staff_or_admin
from backend.schemas import DiscountRuleOut, DiscountRuleCreate

router = APIRouter(prefix="/api/discounts", tags=["Discount Rules"])

@router.get("", response_model=List[DiscountRuleOut])
def list_discounts(
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    return db.query(DiscountRule).order_by(DiscountRule.created_at.desc()).all()

@router.get("/{discount_id}", response_model=DiscountRuleOut)
def get_discount(
    discount_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    d = db.query(DiscountRule).filter(DiscountRule.id == discount_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Discount rule not found.")
    return d

@router.post("", response_model=DiscountRuleOut)
def create_discount_rule(
    payload: DiscountRuleCreate,
    current_user: User = Depends(require_admin),  # ONLY admin can create discount rules
    db: Session = Depends(get_db)
):
    # Verify unique code
    existing = db.query(DiscountRule).filter(DiscountRule.code == payload.code.upper().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Discount code '{payload.code.upper()}' already exists."
        )

    rule = DiscountRule(
        code=payload.code.upper().strip(),
        name=payload.name,
        discount_type=payload.discount_type.lower(),
        value=payload.value,
        min_purchase_amount=payload.min_purchase_amount,
        min_quantity=payload.min_quantity,
        start_date=payload.start_date,
        end_date=payload.end_date,
        usage_limit=payload.usage_limit,
        used_count=0,
        target_type=payload.target_type,
        product_id=payload.product_id,
        is_active=payload.is_active
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    log = ActivityLog(
        user_id=current_user.id,
        action="DISCOUNT_RULE_CREATED",
        entity_type="discount_rule",
        entity_id=rule.id,
        details=f"Admin {current_user.email} created discount rule: {rule.code} ({rule.value} {rule.discount_type})"
    )
    db.add(log)
    db.commit()

    return rule

@router.put("/{discount_id}", response_model=DiscountRuleOut)
def update_discount_rule(
    discount_id: int,
    payload: DiscountRuleCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    rule = db.query(DiscountRule).filter(DiscountRule.id == discount_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Discount rule not found.")

    for k, v in payload.model_dump().items():
        if k == "code":
            setattr(rule, k, v.upper().strip())
        else:
            setattr(rule, k, v)

    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{discount_id}")
def delete_discount_rule(
    discount_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    rule = db.query(DiscountRule).filter(DiscountRule.id == discount_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Discount rule not found.")
    rule.is_active = False
    db.commit()
    return {"message": "Discount rule deactivated successfully."}
