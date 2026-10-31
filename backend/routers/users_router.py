from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, ActivityLog
from backend.auth import require_admin, require_staff_or_admin, hash_password
from backend.schemas import UserOut, StaffCreate, UserRegister

router = APIRouter(prefix="/api/users", tags=["Users & Staff"])

@router.get("/staff", response_model=List[UserOut])
def get_staff_members(
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(User.role.in_(["admin", "staff"])).all()

@router.post("/staff", response_model=UserOut)
def create_staff_member(
    payload: StaffCreate,
    current_user: User = Depends(require_admin),  # ONLY admin can add staff
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role="staff"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log = ActivityLog(
        user_id=current_user.id,
        action="STAFF_CREATED",
        entity_type="user",
        entity_id=user.id,
        details=f"Admin {current_user.email} created staff member: {user.email}"
    )
    db.add(log)
    db.commit()

    return user

@router.get("/customers", response_model=List[UserOut])
def get_customers(
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    return db.query(User).filter(User.role == "customer").order_by(User.full_name.asc()).all()

@router.post("/customers", response_model=UserOut)
def create_customer(
    payload: UserRegister,
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A customer with this email address already exists."
        )

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        company_name=payload.company_name,
        phone=payload.phone,
        role="customer"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log = ActivityLog(
        user_id=current_user.id,
        action="CUSTOMER_CREATED",
        entity_type="user",
        entity_id=user.id,
        details=f"User {current_user.email} created customer account: {user.email}"
    )
    db.add(log)
    db.commit()

    return user
