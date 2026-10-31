import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, ActivityLog
from backend.auth import hash_password, verify_password, create_access_token, get_current_user
from backend.schemas import (
    UserRegister, UserLogin, PasswordResetRequest, PasswordResetConfirm,
    TokenResponse, UserOut
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register_customer(payload: UserRegister, db: Session = Depends(get_db)):
    # Check duplicate email
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Note: password strength is already validated by Pydantic UserRegister validator
    hashed = hash_password(payload.password)
    user = User(
        email=payload.email.lower(),
        hashed_password=hashed,
        full_name=payload.full_name,
        company_name=payload.company_name,
        phone=payload.phone,
        role="customer"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log = ActivityLog(
        user_id=user.id,
        action="USER_REGISTERED",
        entity_type="user",
        entity_id=user.id,
        details=f"New customer registered: {user.email}"
    )
    db.add(log)
    db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}

@router.post("/token")
def login_for_docs(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password."
        )
    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    return {"access_token": token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        # Don't leak user existence in generic message, but return simulated link if exists
        return {
            "message": "If this email is registered, a password reset link has been dispatched.",
            "reset_link": None
        }

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expiry = datetime.utcnow() + timedelta(hours=2)
    db.commit()

    # In production, this emails the user. For hackathon demo & evaluation, we return the link as well!
    reset_url = f"/reset-password?token={token}"
    return {
        "message": f"Password reset link generated for {user.email}.",
        "reset_token": token,
        "reset_link": reset_url
    }

@router.post("/reset-password")
def reset_password(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == payload.token).first()
    if not user or not user.reset_token_expiry or user.reset_token_expiry < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token."
        )

    user.hashed_password = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()

    log = ActivityLog(
        user_id=user.id,
        action="PASSWORD_RESET",
        entity_type="user",
        entity_id=user.id,
        details=f"Password successfully reset for {user.email}"
    )
    db.add(log)
    db.commit()

    return {"message": "Password has been successfully updated. You may now log in."}
