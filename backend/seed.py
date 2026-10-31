from datetime import date, datetime, timedelta
from backend.database import SessionLocal, engine, Base
from backend.models import (
    User, Product, ProductVariant, TaxRule, DiscountRule,
    SubscriptionPlan, QuotationTemplate, QuotationTemplateLine,
    Subscription, SubscriptionLine, Invoice, InvoiceLine, Payment, ActivityLog
)
from backend.auth import hash_password

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "admin@brightloop.com").first():
            print("Database already seeded.")
            return

        print("Seeding Brightloop Subscription Management System...")

        # 1. Users
        # Password for all demo accounts meets requirements: >8 chars, uppercase, lowercase, special char
        default_pwd = hash_password("Brightloop@2026")

        admin_user = User(
            email="admin@brightloop.com",
            hashed_password=default_pwd,
            full_name="Alex Mercer (Admin)",
            role="admin",
            company_name="Brightloop Software HQ",
            phone="+1 555-0100"
        )
        staff_user = User(
            email="sarah.rep@brightloop.com",
            hashed_password=default_pwd,
            full_name="Sarah Jenkins (Sales Rep)",
            role="staff",
            company_name="Brightloop Software",
            phone="+1 555-0101"
        )
        customer1 = User(
            email="shop@cornerstore.com",
            hashed_password=default_pwd,
            full_name="Marcus Vance",
            role="customer",
            company_name="Corner Store LLC",
            phone="+1 555-0201"
        )
        customer2 = User(
            email="billing@acmecorp.com",
            hashed_password=default_pwd,
            full_name="Elena Rostova",
            role="customer",
            company_name="Acme Corporation",
            phone="+1 555-0202"
        )
        customer3 = User(
            email="alex@novatech.io",
            hashed_password=default_pwd,
            full_name="Alex Chen",
            role="customer",
            company_name="NovaTech Solutions",
            phone="+1 555-0203"
        )

        db.add_all([admin_user, staff_user, customer1, customer2, customer3])
        db.flush()

        # 2. Tax Rules
        tax_gst = TaxRule(name="GST 18%", rate_percent=18.0, is_default=True, is_active=True, description="Default Goods & Services Tax")
        tax_vat = TaxRule(name="VAT 10%", rate_percent=10.0, is_default=False, is_active=True, description="Value Added Tax for EU clients")
        tax_zero = TaxRule(name="Zero Tax 0%", rate_percent=0.0, is_default=False, is_active=True, description="Tax Exempt Clients")
        db.add_all([tax_gst, tax_vat, tax_zero])
        db.flush()

        # 3. Products & Variants (Exact PDF mention: Odoo brand adds 560 to price)
        p1 = Product(
            name="Brightloop Cloud ERP",
            product_type="Software",
            sales_price=1200.0,
            cost_price=350.0,
            notes="Unified business software platform with CRM, Billing, and Analytics."
        )
        p2 = Product(
            name="Automated Recurring Billing Engine",
            product_type="Software",
            sales_price=350.0,
            cost_price=60.0,
            notes="Automated billing day runner with tax calculations."
        )
        p3 = Product(
            name="24/7 Dedicated Support SLA",
            product_type="Service",
            sales_price=499.0,
            cost_price=150.0,
            notes="Guaranteed 1-hour response SLA with dedicated account rep."
        )
        p4 = Product(
            name="Multi-Currency Global Suite",
            product_type="Add-on",
            sales_price=250.0,
            cost_price=40.0,
            notes="Live exchange rate conversions and international compliance."
        )
        db.add_all([p1, p2, p3, p4])
        db.flush()

        # Variants for ERP
        v_std = ProductVariant(product_id=p1.id, attribute_name="Brand", attribute_value="Standard Edition", price_extra=0.0)
        v_odoo = ProductVariant(product_id=p1.id, attribute_name="Brand", attribute_value="Odoo Brand", price_extra=560.0) # Adds 560
        v_ent = ProductVariant(product_id=p1.id, attribute_name="Brand", attribute_value="Enterprise Titanium", price_extra=1200.0)

        # Variants for Billing Engine
        v_bill_pro = ProductVariant(product_id=p2.id, attribute_name="Tier", attribute_value="Pro (Up to 10k subs)", price_extra=0.0)
        v_bill_high = ProductVariant(product_id=p2.id, attribute_name="Tier", attribute_value="High-Volume Scale", price_extra=300.0)

        db.add_all([v_std, v_odoo, v_ent, v_bill_pro, v_bill_high])
        db.flush()

        # 4. Subscription Plans (Scene 2: daily, weekly, monthly, yearly + lifecycle policies)
        plan_monthly = SubscriptionPlan(
            name="Growth Monthly",
            description="Our most popular monthly plan for high-velocity teams.",
            billing_frequency="monthly",
            base_price=1200.0,
            min_quantity=1,
            auto_close_on_end=False,
            allow_early_close=True,
            allow_pause=True,
            allow_renewal=True
        )
        plan_yearly = SubscriptionPlan(
            name="Enterprise Yearly Contract",
            description="Annual software contract with guaranteed capacity & priority rep.",
            billing_frequency="yearly",
            base_price=12000.0,
            min_quantity=1,
            auto_close_on_end=False,
            allow_early_close=False,
            allow_pause=False,
            allow_renewal=True
        )
        plan_weekly = SubscriptionPlan(
            name="Sprint Weekly Fast-Track",
            description="Weekly billing plan for short acceleration sprints.",
            billing_frequency="weekly",
            base_price=350.0,
            min_quantity=1,
            auto_close_on_end=True,
            allow_early_close=True,
            allow_pause=True,
            allow_renewal=True
        )
        plan_daily = SubscriptionPlan(
            name="Daily High-Compute Cluster",
            description="Billed on a daily basis for dynamic burst workloads.",
            billing_frequency="daily",
            base_price=50.0,
            min_quantity=5,
            auto_close_on_end=True,
            allow_early_close=True,
            allow_pause=False,
            allow_renewal=True
        )
        plan_pilot = SubscriptionPlan(
            name="Fixed 1-Year Closed Pilot",
            description="Fixed 12-month pilot that closes automatically on expiry date.",
            billing_frequency="monthly",
            base_price=800.0,
            min_quantity=1,
            auto_close_on_end=True,
            allow_early_close=False,
            allow_pause=False,
            allow_renewal=False
        )
        db.add_all([plan_monthly, plan_yearly, plan_weekly, plan_daily, plan_pilot])
        db.flush()

        # 5. Discount Rules (Scene 5: only admin can create, fixed/percent, min qty/purchase, whole/product)
        disc_vol = DiscountRule(
            code="VOLUME15",
            name="Volume Buyer Discount (15% off for 5+ seats)",
            discount_type="percentage",
            value=15.0,
            min_purchase_amount=0.0,
            min_quantity=5,
            usage_limit=50,
            used_count=3,
            target_type="whole_subscription"
        )
        disc_odoo = DiscountRule(
            code="ODOO20",
            name="Odoo Partner Special Promo (20% off ERP)",
            discount_type="percentage",
            value=20.0,
            min_purchase_amount=500.0,
            min_quantity=1,
            usage_limit=100,
            used_count=7,
            target_type="specific_products",
            product_id=p1.id
        )
        disc_flat = DiscountRule(
            code="SAVE100",
            name="Flash Sale (₹100 flat off over ₹500)",
            discount_type="fixed",
            value=100.0,
            min_purchase_amount=500.0,
            min_quantity=1,
            usage_limit=200,
            used_count=18,
            target_type="whole_subscription"
        )
        db.add_all([disc_vol, disc_odoo, disc_flat])
        db.flush()

        # 6. Quotation Templates (Scene 3: template with plan, product lines, validity days)
        tmpl_enterprise = QuotationTemplate(
            name="Enterprise Complete Suite (Yearly)",
            plan_id=plan_yearly.id,
            validity_days=30,
            notes="Full-tier template for enterprise prospects with Cloud ERP (Odoo brand) + Support SLA."
        )
        tmpl_starter = QuotationTemplate(
            name="Small Business Starter Pack (Monthly)",
            plan_id=plan_monthly.id,
            validity_days=14,
            notes="Tailored package for retail businesses with Standard ERP and Recurring Billing."
        )
        db.add_all([tmpl_enterprise, tmpl_starter])
        db.flush()

        # Template Lines
        # Enterprise template lines
        db.add(QuotationTemplateLine(
            template_id=tmpl_enterprise.id,
            product_id=p1.id,
            variant_id=v_odoo.id,  # Odoo variant (+560)
            quantity=1,
            unit_price=1760.0,  # 1200 + 560
            discount_percent=0.0
        ))
        db.add(QuotationTemplateLine(
            template_id=tmpl_enterprise.id,
            product_id=p3.id,
            quantity=1,
            unit_price=499.0,
            discount_percent=0.0
        ))

        # Starter template lines
        db.add(QuotationTemplateLine(
            template_id=tmpl_starter.id,
            product_id=p1.id,
            variant_id=v_std.id,
            quantity=1,
            unit_price=1200.0,
            discount_percent=10.0
        ))
        db.add(QuotationTemplateLine(
            template_id=tmpl_starter.id,
            product_id=p2.id,
            quantity=1,
            unit_price=350.0,
            discount_percent=0.0
        ))
        db.flush()

        today = date.today()

        # 7. Subscriptions across lifecycle states
        # Sub 1: Active Enterprise for Acme Corp
        sub1 = Subscription(
            sub_number="SUB-2026-0001",
            customer_id=customer2.id,
            plan_id=plan_yearly.id,
            status="active",
            start_date=today - timedelta(days=60),
            expiry_date=today + timedelta(days=305),
            next_billing_date=today + timedelta(days=15),
            payment_terms="Net 30",
            auto_close_on_end=False,
            allow_early_close=False,
            allow_pause=False,
            allow_renewal=True,
            notes="Acme Corp annual contract"
        )
        # Sub 2: Active Monthly for Corner Store (DUE TODAY FOR BILLING DAY DEMO!)
        sub2 = Subscription(
            sub_number="SUB-2026-0002",
            customer_id=customer1.id,
            plan_id=plan_monthly.id,
            status="active",
            start_date=today - timedelta(days=30),
            expiry_date=today + timedelta(days=335),
            next_billing_date=today,  # Due today!
            payment_terms="Net 15",
            auto_close_on_end=False,
            allow_early_close=True,
            allow_pause=True,
            allow_renewal=True,
            applied_discount_id=disc_flat.id,
            notes="Corner store retail monthly plan with SAVE100 discount"
        )
        # Sub 3: NovaTech in Quotation state
        sub3 = Subscription(
            sub_number="SUB-2026-0003",
            customer_id=customer3.id,
            plan_id=plan_weekly.id,
            template_id=tmpl_starter.id,
            status="quotation",
            start_date=today,
            expiry_date=today + timedelta(days=14),
            payment_terms="Immediate",
            auto_close_on_end=True,
            allow_early_close=True,
            allow_pause=True,
            allow_renewal=True,
            notes="Sprint acceleration quote pending customer review"
        )
        # Sub 4: Paused subscription
        sub4 = Subscription(
            sub_number="SUB-2026-0004",
            customer_id=customer3.id,
            plan_id=plan_monthly.id,
            status="paused",
            start_date=today - timedelta(days=90),
            expiry_date=today + timedelta(days=180),
            payment_terms="Net 15",
            auto_close_on_end=False,
            allow_early_close=True,
            allow_pause=True,
            allow_renewal=True,
            notes="Temporarily paused for system upgrade"
        )
        # Sub 5: Draft subscription
        sub5 = Subscription(
            sub_number="SUB-2026-0005",
            customer_id=customer1.id,
            plan_id=plan_daily.id,
            status="draft",
            start_date=today,
            payment_terms="Immediate",
            notes="Draft test configuration"
        )
        # Sub 6: Closed subscription
        sub6 = Subscription(
            sub_number="SUB-2026-0006",
            customer_id=customer2.id,
            plan_id=plan_pilot.id,
            status="closed",
            start_date=today - timedelta(days=400),
            expiry_date=today - timedelta(days=35),
            payment_terms="Net 30",
            notes="Completed 1-year pilot - auto-closed on expiry"
        )

        db.add_all([sub1, sub2, sub3, sub4, sub5, sub6])
        db.flush()

        # Subscription Lines
        # Sub 1 lines: Odoo ERP (1760) + Support SLA (499)
        l1 = SubscriptionLine(
            subscription_id=sub1.id,
            product_id=p1.id,
            variant_id=v_odoo.id,
            quantity=5,  # 5 seats
            unit_price=1760.0,
            tax_id=tax_gst.id,
            subtotal=8800.0,
            tax_amount=1584.0,
            total_amount=10384.0
        )
        l2 = SubscriptionLine(
            subscription_id=sub1.id,
            product_id=p3.id,
            quantity=1,
            unit_price=499.0,
            tax_id=tax_gst.id,
            subtotal=499.0,
            tax_amount=89.82,
            total_amount=588.82
        )
        # Sub 2 lines: ERP Standard (1200) + Billing Engine (350)
        l3 = SubscriptionLine(
            subscription_id=sub2.id,
            product_id=p1.id,
            variant_id=v_std.id,
            quantity=1,
            unit_price=1200.0,
            tax_id=tax_gst.id,
            subtotal=1200.0,
            tax_amount=216.0,
            total_amount=1416.0
        )
        l4 = SubscriptionLine(
            subscription_id=sub2.id,
            product_id=p2.id,
            quantity=1,
            unit_price=350.0,
            tax_id=tax_gst.id,
            subtotal=350.0,
            tax_amount=63.0,
            total_amount=413.0
        )
        # Sub 3 lines: Weekly ERP
        l5 = SubscriptionLine(
            subscription_id=sub3.id,
            product_id=p1.id,
            quantity=1,
            unit_price=350.0,
            tax_id=tax_gst.id,
            subtotal=350.0,
            tax_amount=63.0,
            total_amount=413.0
        )

        db.add_all([l1, l2, l3, l4, l5])
        db.flush()

        # 8. Invoices & Payments (Draft, Confirmed, Paid, and an Overdue Invoice to chase!)
        # Past Paid Invoice for Acme Corp
        inv_paid = Invoice(
            invoice_number="INV-2026-0001",
            subscription_id=sub1.id,
            customer_id=customer2.id,
            issue_date=today - timedelta(days=60),
            due_date=today - timedelta(days=30),
            billing_period_start=today - timedelta(days=60),
            billing_period_end=today - timedelta(days=30),
            status="paid",
            subtotal=9299.0,
            tax_amount=1673.82,
            discount_amount=0.0,
            total_amount=10972.82,
            amount_paid=10972.82,
            amount_due=0.0,
            sent_at=datetime.utcnow() - timedelta(days=59),
            notes="Initial period invoice for SUB-2026-0001"
        )
        db.add(inv_paid)
        db.flush()

        db.add(InvoiceLine(
            invoice_id=inv_paid.id,
            product_id=p1.id,
            variant_id=v_odoo.id,
            description="Brightloop Cloud ERP (Brand: Odoo Brand) [5 Seats]",
            quantity=5,
            unit_price=1760.0,
            tax_rate=18.0,
            tax_amount=1584.0,
            total_amount=10384.0
        ))
        db.add(InvoiceLine(
            invoice_id=inv_paid.id,
            product_id=p3.id,
            description="24/7 Dedicated Support SLA",
            quantity=1,
            unit_price=499.0,
            tax_rate=18.0,
            tax_amount=89.82,
            total_amount=588.82
        ))

        # Payment for inv_paid
        pay1 = Payment(
            payment_number="PAY-2026-0001",
            invoice_id=inv_paid.id,
            customer_id=customer2.id,
            amount=10972.82,
            payment_method="Bank Transfer",
            payment_date=today - timedelta(days=35),
            reference_note="Wire Ref: ACH-8829104"
        )
        db.add(pay1)

        # Overdue Invoice for NovaTech (for finance chasing demonstration!)
        inv_overdue = Invoice(
            invoice_number="INV-2026-0002",
            subscription_id=sub4.id,
            customer_id=customer3.id,
            issue_date=today - timedelta(days=45),
            due_date=today - timedelta(days=15),  # 15 days overdue!
            billing_period_start=today - timedelta(days=45),
            billing_period_end=today - timedelta(days=15),
            status="confirmed",
            subtotal=1450.0,
            tax_amount=261.0,
            discount_amount=0.0,
            total_amount=1711.0,
            amount_paid=0.0,
            amount_due=1711.0,
            sent_at=datetime.utcnow() - timedelta(days=44),
            notes="Overdue cycle invoice for SUB-2026-0004"
        )
        db.add(inv_overdue)
        db.flush()

        db.add(InvoiceLine(
            invoice_id=inv_overdue.id,
            product_id=p1.id,
            variant_id=v_std.id,
            description="Brightloop Cloud ERP (Brand: Standard Edition)",
            quantity=1,
            unit_price=1200.0,
            tax_rate=18.0,
            tax_amount=216.0,
            total_amount=1416.0
        ))
        db.add(InvoiceLine(
            invoice_id=inv_overdue.id,
            product_id=p4.id,
            description="Multi-Currency Global Suite",
            quantity=1,
            unit_price=250.0,
            tax_rate=18.0,
            tax_amount=45.0,
            total_amount=295.0
        ))

        # Active Unpaid Confirmed Invoice for Corner Store
        inv_active = Invoice(
            invoice_number="INV-2026-0003",
            subscription_id=sub2.id,
            customer_id=customer1.id,
            issue_date=today - timedelta(days=5),
            due_date=today + timedelta(days=10),
            billing_period_start=today - timedelta(days=5),
            billing_period_end=today + timedelta(days=25),
            status="confirmed",
            subtotal=1550.0,
            tax_amount=279.0,
            discount_amount=100.0,  # SAVE100 applied
            total_amount=1729.0,
            amount_paid=0.0,
            amount_due=1729.0,
            sent_at=datetime.utcnow() - timedelta(days=4),
            notes="Monthly cycle with ₹100 promotional discount"
        )
        db.add(inv_active)
        db.flush()

        db.add(InvoiceLine(
            invoice_id=inv_active.id,
            product_id=p1.id,
            variant_id=v_std.id,
            description="Brightloop Cloud ERP (Brand: Standard Edition)",
            quantity=1,
            unit_price=1200.0,
            tax_rate=18.0,
            tax_amount=216.0,
            total_amount=1416.0
        ))
        db.add(InvoiceLine(
            invoice_id=inv_active.id,
            product_id=p2.id,
            description="Automated Recurring Billing Engine",
            quantity=1,
            unit_price=350.0,
            tax_rate=18.0,
            tax_amount=63.0,
            total_amount=413.0
        ))

        # Activity Logs
        logs = [
            ActivityLog(user_id=admin_user.id, action="SYSTEM_INIT", entity_type="system", details="System initialized with enterprise configuration."),
            ActivityLog(user_id=admin_user.id, action="PRODUCT_CREATED", entity_type="product", entity_id=p1.id, details="Product 'Brightloop Cloud ERP' created with Odoo brand variant (+₹560)."),
            ActivityLog(user_id=admin_user.id, action="DISCOUNT_CREATED", entity_type="discount_rule", entity_id=disc_vol.id, details="Volume discount rule VOLUME15 created."),
            ActivityLog(user_id=staff_user.id, action="INVOICE_SENT", entity_type="invoice", entity_id=inv_overdue.id, details="Invoice INV-2026-0002 dispatched to alex@novatech.io."),
            ActivityLog(user_id=customer2.id, action="PAYMENT_RECEIVED", entity_type="payment", entity_id=pay1.id, details="Payment PAY-2026-0001 for ₹10,972.82 received via Bank Transfer.")
        ]
        db.add_all(logs)

        db.commit()
        print("Database successfully seeded with realistic Brightloop Software data!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
