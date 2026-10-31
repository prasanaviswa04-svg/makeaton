from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import SubscriptionPlan, User, ActivityLog
from backend.auth import require_admin, require_staff_or_admin
from backend.schemas import SubscriptionPlanOut, SubscriptionPlanCreate

router = APIRouter(prefix="/api/plans", tags=["Subscription Plans"])

@router.get("", response_model=List[SubscriptionPlanOut])
def list_plans(
    is_active: Optional[bool] = None,
    billing_frequency: Optional[str] = None,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(SubscriptionPlan)
    if is_active is not None:
        query = query.filter(SubscriptionPlan.is_active == is_active)
    if billing_frequency:
        query = query.filter(SubscriptionPlan.billing_frequency == billing_frequency.lower())
    return query.order_by(SubscriptionPlan.name.asc()).all()

@router.get("/{plan_id}", response_model=SubscriptionPlanOut)
def get_plan(
    plan_id: int,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Subscription plan not found.")
    return plan

@router.post("", response_model=SubscriptionPlanOut)
def create_plan(
    payload: SubscriptionPlanCreate,
    current_user: User = Depends(require_admin),  # Admin decides which, plan by plan
    db: Session = Depends(get_db)
):
    valid_frequencies = ["daily", "weekly", "monthly", "yearly"]
    if payload.billing_frequency.lower() not in valid_frequencies:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Frequency must be one of: {', '.join(valid_frequencies)}"
        )

    plan = SubscriptionPlan(
        name=payload.name,
        description=payload.description,
        billing_frequency=payload.billing_frequency.lower(),
        base_price=payload.base_price,
        min_quantity=payload.min_quantity,
        available_from=payload.available_from,
        available_until=payload.available_until,
        auto_close_on_end=payload.auto_close_on_end,
        allow_early_close=payload.allow_early_close,
        allow_pause=payload.allow_pause,
        allow_renewal=payload.allow_renewal,
        is_active=payload.is_active
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)

    log = ActivityLog(
        user_id=current_user.id,
        action="PLAN_CREATED",
        entity_type="plan",
        entity_id=plan.id,
        details=f"Admin {current_user.email} created plan '{plan.name}' ({plan.billing_frequency})."
    )
    db.add(log)
    db.commit()

    return plan

@router.put("/{plan_id}", response_model=SubscriptionPlanOut)
def update_plan(
    plan_id: int,
    payload: SubscriptionPlanCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")

    for k, v in payload.model_dump().items():
        setattr(plan, k, v)

    db.commit()
    db.refresh(plan)
    return plan

@router.delete("/{plan_id}")
def delete_plan(
    plan_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found.")
    plan.is_active = False
    db.commit()
    return {"message": "Plan deactivated successfully."}
