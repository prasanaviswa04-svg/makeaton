import pytest
import uuid
from datetime import date, timedelta
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.models import User, Product, ProductVariant, SubscriptionPlan, Subscription, Invoice, TaxRule, DiscountRule

client = TestClient(app)

def get_token(email, password="Brightloop@2026"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.json()["access_token"]

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

# ================= SCENE 1: SIGNUP, PASSWORD RULES & RBAC =================
def test_scene1_password_validation_rules():
    uid = uuid.uuid4().hex[:6]
    # 1. Short password (< 9 chars) -> fails
    res1 = client.post("/api/auth/register", json={
        "email": f"test_short_{uid}@example.com",
        "password": "Pass1!",
        "full_name": "Test Short"
    })
    assert res1.status_code == 422

    # 2. Missing uppercase -> fails
    res2 = client.post("/api/auth/register", json={
        "email": f"test_noupper_{uid}@example.com",
        "password": "password123!",
        "full_name": "Test NoUpper"
    })
    assert res2.status_code == 422

    # 3. Missing lowercase -> fails
    res3 = client.post("/api/auth/register", json={
        "email": f"test_nolower_{uid}@example.com",
        "password": "PASSWORD123!",
        "full_name": "Test NoLower"
    })
    assert res3.status_code == 422

    # 4. Missing special char -> fails
    res4 = client.post("/api/auth/register", json={
        "email": f"test_nospecial_{uid}@example.com",
        "password": "Password123",
        "full_name": "Test NoSpecial"
    })
    assert res4.status_code == 422

    # 5. Valid strong password (> 8 chars, Upper, Lower, Special) -> succeeds!
    res5 = client.post("/api/auth/register", json={
        "email": f"valid_user_{uid}@example.com",
        "password": "ValidPassword@2026",
        "full_name": "Valid User",
        "company_name": "Test Retailers"
    })
    assert res5.status_code == 200
    assert "access_token" in res5.json()
    assert res5.json()["user"]["role"] == "customer"

def test_scene1_rbac_controls():
    uid = uuid.uuid4().hex[:6]
    admin_token = get_token("admin@brightloop.com")
    staff_token = get_token("sarah.rep@brightloop.com")
    cust_token = get_token("shop@cornerstore.com")

    # Only admin can add staff member
    # Staff attempts to add staff -> 403 Forbidden
    res_staff_try = client.post("/api/users/staff", json={
        "email": f"illegal_staff_{uid}@brightloop.com",
        "password": "Brightloop@2026",
        "full_name": "Illegal Staff"
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert res_staff_try.status_code == 403

    # Admin adds staff -> 200 OK
    res_admin = client.post("/api/users/staff", json={
        "email": f"new_staff_{uid}@brightloop.com",
        "password": "Brightloop@2026",
        "full_name": "New Staff Member"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    assert res_admin.json()["role"] == "staff"

    # Customer attempts to view staff list -> 403 Forbidden
    res_cust_try = client.get("/api/users/staff", headers={"Authorization": f"Bearer {cust_token}"})
    assert res_cust_try.status_code == 403

# ================= SCENE 2: PRODUCTS, VARIANTS & PLANS =================
def test_scene2_product_with_odoo_variant():
    admin_token = get_token("admin@brightloop.com")
    
    # Verify Brightloop Cloud ERP has Odoo Brand variant (+560)
    res = client.get("/api/products", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    products = res.json()
    erp = next((p for p in products if "ERP" in p["name"]), None)
    assert erp is not None
    
    odoo_variant = next((v for v in erp["variants"] if "Odoo" in v["attribute_value"]), None)
    assert odoo_variant is not None
    assert odoo_variant["price_extra"] == 560.0

def test_scene2_subscription_plans_lifecycle_policies():
    admin_token = get_token("admin@brightloop.com")
    res = client.get("/api/plans", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    plans = res.json()
    
    # Check frequency diversity: daily, weekly, monthly, yearly
    frequencies = {p["billing_frequency"] for p in plans}
    assert "daily" in frequencies
    assert "weekly" in frequencies
    assert "monthly" in frequencies
    assert "yearly" in frequencies

# ================= SCENE 3: QUOTES TO SUBSCRIPTIONS =================
def test_scene3_quotation_template_conversion():
    staff_token = get_token("sarah.rep@brightloop.com")
    
    # Get templates
    t_res = client.get("/api/quotes/templates", headers={"Authorization": f"Bearer {staff_token}"})
    assert t_res.status_code == 200
    templates = t_res.json()
    assert len(templates) > 0
    tmpl = templates[0]

    # Convert template into subscription quote for a customer
    c_res = client.get("/api/users/customers", headers={"Authorization": f"Bearer {staff_token}"})
    cust_id = c_res.json()[0]["id"]

    sub_res = client.post(f"/api/subscriptions/from-template/{tmpl['id']}", params={
        "customer_id": cust_id,
        "payment_terms": "Net 15"
    }, headers={"Authorization": f"Bearer {staff_token}"})
    
    assert sub_res.status_code == 200
    sub = sub_res.json()
    assert sub["status"] == "quotation"
    assert sub["payment_terms"] == "Net 15"
    assert len(sub["lines"]) > 0

    # Move from Quotation to Confirmed to Active
    sub_id = sub["id"]
    res_conf = client.post(f"/api/subscriptions/{sub_id}/status/confirmed", headers={"Authorization": f"Bearer {staff_token}"})
    assert res_conf.status_code == 200
    assert res_conf.json()["status"] == "confirmed"

    res_act = client.post(f"/api/subscriptions/{sub_id}/status/active", headers={"Authorization": f"Bearer {staff_token}"})
    assert res_act.status_code == 200
    assert res_act.json()["status"] == "active"
    assert res_act.json()["next_billing_date"] is not None

# ================= SCENE 4: BILLING DAY & PDF INVOICING =================
def test_scene4_billing_day_idempotency_and_pdf():
    staff_token = get_token("sarah.rep@brightloop.com")

    # Run billing day for today
    today_str = str(date.today())
    run1 = client.post("/api/billing/run-billing-day", params={"target_date": today_str, "auto_confirm": True}, headers={"Authorization": f"Bearer {staff_token}"})
    assert run1.status_code == 200

    # Second immediate run should NOT duplicate invoices ("Nothing should be billed twice or skipped")
    run2 = client.post("/api/billing/run-billing-day", params={"target_date": today_str, "auto_confirm": True}, headers={"Authorization": f"Bearer {staff_token}"})
    assert run2.status_code == 200
    data2 = run2.json()
    assert data2["invoices_generated"] == 0, "Duplicate invoice generated! Idempotency failed."

    # Test PDF generation
    invs_res = client.get("/api/billing/invoices", headers={"Authorization": f"Bearer {staff_token}"})
    assert invs_res.status_code == 200
    invoices = invs_res.json()
    assert len(invoices) > 0
    inv = invoices[0]

    pdf_res = client.get(f"/api/billing/invoices/{inv['id']}/pdf", headers={"Authorization": f"Bearer {staff_token}"})
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000

# ================= SCENE 5: DISCOUNTS ENGINE =================
def test_scene5_discount_rules():
    uid = uuid.uuid4().hex[:6].upper()
    admin_token = get_token("admin@brightloop.com")
    staff_token = get_token("sarah.rep@brightloop.com")

    # Internal staff cannot create discount rules
    res_staff = client.post("/api/discounts", json={
        "code": f"ILLEGAL_{uid}",
        "name": "Illegal",
        "discount_type": "fixed",
        "value": 50.0
    }, headers={"Authorization": f"Bearer {staff_token}"})
    assert res_staff.status_code == 403

    # Admin creates valid discount rule
    code = f"DISC_{uid}"
    res_admin = client.post("/api/discounts", json={
        "code": code,
        "name": f"Summer Promo {uid} 25% Off",
        "discount_type": "percentage",
        "value": 25.0,
        "min_purchase_amount": 100.0,
        "min_quantity": 1,
        "usage_limit": 10,
        "target_type": "whole_subscription"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    assert res_admin.json()["code"] == code

# ================= SCENE 6: PAYMENTS ENGINE =================
def test_scene6_record_payment():
    staff_token = get_token("sarah.rep@brightloop.com")

    # Find invoice with amount_due > 0
    invs_res = client.get("/api/billing/invoices", headers={"Authorization": f"Bearer {staff_token}"})
    unpaid = next((i for i in invs_res.json() if i["amount_due"] > 0 and i["status"] != "cancelled"), None)
    assert unpaid is not None

    pay_res = client.post("/api/payments", json={
        "invoice_id": unpaid["id"],
        "amount": unpaid["amount_due"],
        "payment_method": "Credit Card",
        "reference_note": "Automated Test Payment"
    }, headers={"Authorization": f"Bearer {staff_token}"})
    
    assert pay_res.status_code == 200
    pay = pay_res.json()
    assert pay["amount"] == unpaid["amount_due"]

    # Check invoice status transitioned to paid
    updated_inv = client.get(f"/api/billing/invoices/{unpaid['id']}", headers={"Authorization": f"Bearer {staff_token}"}).json()
    assert updated_inv["status"] == "paid"
    assert updated_inv["amount_due"] == 0.0

# ================= SCENE 7: FINANCE DASHBOARD & SLA =================
def test_scene7_finance_dashboard_sla():
    staff_token = get_token("sarah.rep@brightloop.com")

    # Call finance dashboard
    res = client.get("/api/finance/dashboard", headers={"Authorization": f"Bearer {staff_token}"})
    assert res.status_code == 200
    data = res.json()

    assert "summary" in data
    assert "active_subscriptions" in data["summary"]
    assert "mrr" in data["summary"]
    assert "arr" in data["summary"]
    assert "aging_buckets" in data
    assert "monthly_trends" in data

    # Verify SLA requirement (< 2.0s = 2000ms)
    perf = data["performance"]
    assert perf["execution_ms"] < 2000.0
    assert perf["status"] == "PASSED"

def test_scene7_chase_overdue_invoice():
    staff_token = get_token("sarah.rep@brightloop.com")
    invs_res = client.get("/api/billing/invoices", params={"overdue_only": True}, headers={"Authorization": f"Bearer {staff_token}"})
    overdue = invs_res.json()
    if len(overdue) > 0:
        chase_res = client.post(f"/api/finance/chase/{overdue[0]['id']}", headers={"Authorization": f"Bearer {staff_token}"})
        assert chase_res.status_code == 200
        assert chase_res.json()["status"] == "success"
