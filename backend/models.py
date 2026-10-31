from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Date, DateTime, Text, ForeignKey, Enum, Index
)
from sqlalchemy.orm import relationship

from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="customer", nullable=False)  # admin, staff, customer
    company_name = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    subscriptions = relationship("Subscription", back_populates="customer", foreign_keys="Subscription.customer_id")
    invoices = relationship("Invoice", back_populates="customer", foreign_keys="Invoice.customer_id")
    payments = relationship("Payment", back_populates="customer")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    product_type = Column(String(100), default="Software")  # Software, Service, Add-on, Consumable
    sales_price = Column(Float, default=0.0, nullable=False)
    cost_price = Column(Float, default=0.0, nullable=False)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    attribute_name = Column(String(100), nullable=False)  # e.g., "Brand", "Edition"
    attribute_value = Column(String(100), nullable=False)  # e.g., "Odoo", "Enterprise"
    price_extra = Column(Float, default=0.0, nullable=False)  # e.g., +560.0
    is_active = Column(Boolean, default=True)

    product = relationship("Product", back_populates="variants")


class TaxRule(Base):
    __tablename__ = "tax_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g., "GST 18%", "VAT 10%"
    rate_percent = Column(Float, nullable=False, default=0.0)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    description = Column(String(255), nullable=True)


class DiscountRule(Base):
    __tablename__ = "discount_rules"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    discount_type = Column(String(50), nullable=False)  # "percentage" or "fixed"
    value = Column(Float, nullable=False)  # e.g. 15.0 (%) or 50.0 ($)
    min_purchase_amount = Column(Float, default=0.0)
    min_quantity = Column(Integer, default=0)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    usage_limit = Column(Integer, nullable=True)  # max times usable, null for unlimited
    used_count = Column(Integer, default=0)
    target_type = Column(String(50), default="whole_subscription")  # "whole_subscription" or "specific_products"
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product")


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    billing_frequency = Column(String(50), nullable=False)  # daily, weekly, monthly, yearly
    base_price = Column(Float, nullable=False, default=0.0)
    min_quantity = Column(Integer, default=1)
    available_from = Column(Date, nullable=True)
    available_until = Column(Date, nullable=True)
    
    # Lifecycle policies decided plan by plan by admin
    auto_close_on_end = Column(Boolean, default=True)
    allow_early_close = Column(Boolean, default=True)
    allow_pause = Column(Boolean, default=True)
    allow_renewal = Column(Boolean, default=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class QuotationTemplate(Base):
    __tablename__ = "quotation_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)
    validity_days = Column(Integer, default=30)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    plan = relationship("SubscriptionPlan")
    lines = relationship("QuotationTemplateLine", back_populates="template", cascade="all, delete-orphan")


class QuotationTemplateLine(Base):
    __tablename__ = "quotation_template_lines"

    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("quotation_templates.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0.0)
    discount_percent = Column(Float, default=0.0)

    template = relationship("QuotationTemplate", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    sub_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g., SUB-2026-0001
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False, index=True)
    template_id = Column(Integer, ForeignKey("quotation_templates.id"), nullable=True)
    
    # Lifecycle: draft -> quotation -> confirmed -> active -> paused -> closed
    status = Column(String(50), default="draft", index=True, nullable=False)
    start_date = Column(Date, nullable=False, default=date.today)
    expiry_date = Column(Date, nullable=True)
    next_billing_date = Column(Date, nullable=True, index=True)
    payment_terms = Column(String(50), default="Immediate")  # Immediate, Net 15, Net 30, etc.

    # Inherited or overridden lifecycle policies
    auto_close_on_end = Column(Boolean, default=True)
    allow_early_close = Column(Boolean, default=True)
    allow_pause = Column(Boolean, default=True)
    allow_renewal = Column(Boolean, default=True)

    applied_discount_id = Column(Integer, ForeignKey("discount_rules.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("User", back_populates="subscriptions", foreign_keys=[customer_id])
    plan = relationship("SubscriptionPlan")
    template = relationship("QuotationTemplate")
    applied_discount = relationship("DiscountRule")
    lines = relationship("SubscriptionLine", back_populates="subscription", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="subscription", cascade="all, delete-orphan")


class SubscriptionLine(Base):
    __tablename__ = "subscription_lines"

    id = Column(Integer, primary_key=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False, default=0.0)
    tax_id = Column(Integer, ForeignKey("tax_rules.id"), nullable=True)
    discount_amount = Column(Float, default=0.0)
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)

    subscription = relationship("Subscription", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    tax = relationship("TaxRule")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g., INV-2026-0001
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    issue_date = Column(Date, default=date.today, nullable=False)
    due_date = Column(Date, nullable=False, index=True)
    billing_period_start = Column(Date, nullable=False)
    billing_period_end = Column(Date, nullable=False)
    
    # Lifecycle: draft -> confirmed -> paid (or cancelled)
    status = Column(String(50), default="draft", index=True, nullable=False)
    
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    amount_paid = Column(Float, default=0.0)
    amount_due = Column(Float, default=0.0)
    
    sent_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    subscription = relationship("Subscription", back_populates="invoices")
    customer = relationship("User", back_populates="invoices", foreign_keys=[customer_id])
    lines = relationship("InvoiceLine", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_invoice_sub_period", "subscription_id", "billing_period_start", "billing_period_end"),
    )


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    variant_id = Column(Integer, ForeignKey("product_variants.id"), nullable=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price = Column(Float, nullable=False, default=0.0)
    tax_rate = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)

    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_number = Column(String(50), unique=True, index=True, nullable=False)  # e.g., PAY-2026-0001
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=False)  # Credit Card, Bank Transfer, Stripe, Cash, Cheque, UPI
    payment_date = Column(Date, default=date.today, nullable=False)
    reference_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="payments")
    customer = relationship("User", back_populates="payments")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)  # subscription, invoice, payment, discount, etc.
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
