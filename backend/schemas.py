import re
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict

def validate_password_strength(password: str) -> str:
    # "the password must be more than eight characters, with an uppercase letter, a lowercase letter and a special character"
    if len(password) <= 8:
        raise ValueError("Password must be more than 8 characters long (at least 9 characters).")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"[^A-Za-z0-9]", password):
        raise ValueError("Password must contain at least one special character.")
    return password

# ----------------- User & Auth Schemas -----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)

class StaffCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def check_password(cls, v: str) -> str:
        return validate_password_strength(v)

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# ----------------- Product & Variant Schemas -----------------
class ProductVariantBase(BaseModel):
    attribute_name: str
    attribute_value: str
    price_extra: float = 0.0
    is_active: bool = True

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantOut(ProductVariantBase):
    id: int
    product_id: int

    model_config = ConfigDict(from_attributes=True)

class ProductBase(BaseModel):
    name: str
    product_type: str = "Software"
    sales_price: float = 0.0
    cost_price: float = 0.0
    notes: Optional[str] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    variants: Optional[List[ProductVariantCreate]] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    product_type: Optional[str] = None
    sales_price: Optional[float] = None
    cost_price: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ProductOut(ProductBase):
    id: int
    created_at: datetime
    variants: List[ProductVariantOut] = []

    model_config = ConfigDict(from_attributes=True)

# ----------------- Tax Rule Schemas -----------------
class TaxRuleBase(BaseModel):
    name: str
    rate_percent: float
    is_default: bool = False
    is_active: bool = True
    description: Optional[str] = None

class TaxRuleCreate(TaxRuleBase):
    pass

class TaxRuleOut(TaxRuleBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

# ----------------- Discount Rule Schemas -----------------
class DiscountRuleBase(BaseModel):
    code: str
    name: str
    discount_type: str  # percentage or fixed
    value: float
    min_purchase_amount: float = 0.0
    min_quantity: int = 0
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    usage_limit: Optional[int] = None
    target_type: str = "whole_subscription"  # whole_subscription or specific_products
    product_id: Optional[int] = None
    is_active: bool = True

class DiscountRuleCreate(DiscountRuleBase):
    pass

class DiscountRuleOut(DiscountRuleBase):
    id: int
    used_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Subscription Plan Schemas -----------------
class SubscriptionPlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    billing_frequency: str  # daily, weekly, monthly, yearly
    base_price: float
    min_quantity: int = 1
    available_from: Optional[date] = None
    available_until: Optional[date] = None
    auto_close_on_end: bool = True
    allow_early_close: bool = True
    allow_pause: bool = True
    allow_renewal: bool = True
    is_active: bool = True

class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass

class SubscriptionPlanOut(SubscriptionPlanBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Quotation Template Schemas -----------------
class QuotationTemplateLineCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = 1
    unit_price: float
    discount_percent: float = 0.0

class QuotationTemplateLineOut(QuotationTemplateLineCreate):
    id: int
    template_id: int
    product: Optional[ProductOut] = None
    variant: Optional[ProductVariantOut] = None

    model_config = ConfigDict(from_attributes=True)

class QuotationTemplateCreate(BaseModel):
    name: str
    plan_id: int
    validity_days: int = 30
    notes: Optional[str] = None
    lines: List[QuotationTemplateLineCreate] = []

class QuotationTemplateOut(BaseModel):
    id: int
    name: str
    plan_id: int
    validity_days: int
    notes: Optional[str] = None
    created_at: datetime
    plan: Optional[SubscriptionPlanOut] = None
    lines: List[QuotationTemplateLineOut] = []

    model_config = ConfigDict(from_attributes=True)

# ----------------- Subscription Line Schemas -----------------
class SubscriptionLineCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = 1
    unit_price: Optional[float] = None  # if not provided, calculates from product + variant
    tax_id: Optional[int] = None
    discount_amount: float = 0.0

class SubscriptionLineOut(BaseModel):
    id: int
    subscription_id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    unit_price: float
    tax_id: Optional[int] = None
    discount_amount: float
    subtotal: float
    tax_amount: float
    total_amount: float
    product: Optional[ProductOut] = None
    variant: Optional[ProductVariantOut] = None
    tax: Optional[TaxRuleOut] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Subscription Schemas -----------------
class SubscriptionCreate(BaseModel):
    customer_id: int
    plan_id: int
    template_id: Optional[int] = None
    start_date: Optional[date] = None
    expiry_date: Optional[date] = None
    payment_terms: str = "Immediate"
    applied_discount_id: Optional[int] = None
    notes: Optional[str] = None
    lines: List[SubscriptionLineCreate] = []

class SubscriptionUpdate(BaseModel):
    status: Optional[str] = None
    expiry_date: Optional[date] = None
    payment_terms: Optional[str] = None
    applied_discount_id: Optional[int] = None
    notes: Optional[str] = None

class SubscriptionOut(BaseModel):
    id: int
    sub_number: str
    customer_id: int
    plan_id: int
    template_id: Optional[int] = None
    status: str
    start_date: date
    expiry_date: Optional[date] = None
    next_billing_date: Optional[date] = None
    payment_terms: str
    auto_close_on_end: bool
    allow_early_close: bool
    allow_pause: bool
    allow_renewal: bool
    applied_discount_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    customer: Optional[UserOut] = None
    plan: Optional[SubscriptionPlanOut] = None
    applied_discount: Optional[DiscountRuleOut] = None
    lines: List[SubscriptionLineOut] = []

    model_config = ConfigDict(from_attributes=True)

# ----------------- Invoice Line Schemas -----------------
class InvoiceLineOut(BaseModel):
    id: int
    invoice_id: int
    product_id: int
    variant_id: Optional[int] = None
    description: str
    quantity: int
    unit_price: float
    tax_rate: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    product: Optional[ProductOut] = None
    variant: Optional[ProductVariantOut] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Payment Schemas -----------------
class PaymentCreate(BaseModel):
    invoice_id: int
    amount: float
    payment_method: str  # Credit Card, Bank Transfer, Stripe, Cash, Cheque, UPI
    payment_date: Optional[date] = None
    reference_note: Optional[str] = None

class PaymentOut(BaseModel):
    id: int
    payment_number: str
    invoice_id: int
    customer_id: int
    amount: float
    payment_method: str
    payment_date: date
    reference_note: Optional[str] = None
    created_at: datetime
    customer: Optional[UserOut] = None

    model_config = ConfigDict(from_attributes=True)

# ----------------- Invoice Schemas -----------------
class InvoiceCreateManual(BaseModel):
    subscription_id: int
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None

class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    subscription_id: int
    customer_id: int
    issue_date: date
    due_date: date
    billing_period_start: date
    billing_period_end: date
    status: str
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    amount_paid: float
    amount_due: float
    sent_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    customer: Optional[UserOut] = None
    lines: List[InvoiceLineOut] = []
    payments: List[PaymentOut] = []
    is_overdue: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)

# ----------------- Activity Log -----------------
class ActivityLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ----------------- Finance Reports / Dashboard Schemas -----------------
class FinanceDashboardSummary(BaseModel):
    active_subscriptions_count: int
    total_subscriptions_count: int
    mrr: float
    arr: float
    total_revenue_collected: float
    total_outstanding_amount: float
    overdue_invoices_count: int
    overdue_invoices_amount: float
    draft_invoices_count: int
    paid_invoices_count: int
    churn_subscriptions_count: int
    paused_subscriptions_count: int
    recent_invoices: List[InvoiceOut] = []
    recent_payments: List[PaymentOut] = []
