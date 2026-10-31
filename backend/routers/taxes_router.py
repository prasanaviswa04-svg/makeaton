from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import TaxRule, User, ActivityLog
from backend.auth import require_admin, require_staff_or_admin
from backend.schemas import TaxRuleOut, TaxRuleCreate

router = APIRouter(prefix="/api/taxes", tags=["Tax Rules"])

@router.get("", response_model=List[TaxRuleOut])
def list_tax_rules(
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    return db.query(TaxRule).order_by(TaxRule.rate_percent.asc()).all()

@router.post("", response_model=TaxRuleOut)
def create_tax_rule(
    payload: TaxRuleCreate,
    current_user: User = Depends(require_admin),  # Only admin sets tax rules
    db: Session = Depends(get_db)
):
    if payload.is_default:
        # unset previous default
        db.query(TaxRule).update({TaxRule.is_default: False})

    rule = TaxRule(
        name=payload.name,
        rate_percent=payload.rate_percent,
        is_default=payload.is_default,
        is_active=payload.is_active,
        description=payload.description
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    log = ActivityLog(
        user_id=current_user.id,
        action="TAX_RULE_CREATED",
        entity_type="tax_rule",
        entity_id=rule.id,
        details=f"Admin {current_user.email} created tax rule: {rule.name} ({rule.rate_percent}%)"
    )
    db.add(log)
    db.commit()

    return rule

@router.put("/{tax_id}", response_model=TaxRuleOut)
def update_tax_rule(
    tax_id: int,
    payload: TaxRuleCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    rule = db.query(TaxRule).filter(TaxRule.id == tax_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Tax rule not found.")

    if payload.is_default and not rule.is_default:
        db.query(TaxRule).update({TaxRule.is_default: False})

    for k, v in payload.model_dump().items():
        setattr(rule, k, v)

    db.commit()
    db.refresh(rule)
    return rule

@router.delete("/{tax_id}")
def delete_tax_rule(
    tax_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    rule = db.query(TaxRule).filter(TaxRule.id == tax_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Tax rule not found.")
    rule.is_active = False
    db.commit()
    return {"message": "Tax rule deactivated successfully."}
