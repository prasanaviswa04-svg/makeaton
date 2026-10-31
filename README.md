# 🚀 Brightloop Subscription Management System
> **Unified Subscription, Quotation, Recurring Billing & Finance Engine**  
> Problem Statement Reference: `Subscription_Management_System.pdf`

---

## 🌟 Executive Summary

**Brightloop Software** sells software subscriptions by month and year, add-ons that customers toggle on and off, and products in various variants (including the **Odoo brand variant adding 560 to base price**).

This platform replaces fragmented spreadsheets, manual invoices, and scattered bank statements with a high-performance, unified platform that handles the **complete lifecycle of recurring revenue**.

---

## 🎯 Direct Alignment with Problem Statement Scenes

| Scene | Problem Statement Requirement | Implementation in System |
|---|---|---|
| **Scene 1: Customer Signup & RBAC** | Unique email, strict password (> 8 characters, uppercase, lowercase, special character), password reset link, 3 distinct access tiers (Admin, Staff, Customer portal). Only admin can add staff. | Pydantic v2 strength validator (`validate_password_strength`), JWT authentication, reset token generator & preview, role route guards (`require_admin`, `require_staff_or_admin`, `require_customer`). |
| **Scene 2: Product & Plan Launch** | Name, type, sales/cost price, notes, and variants (e.g. Odoo brand +560). Plans with daily, weekly, monthly, yearly cycles, min quantity, validity dates, and lifecycle policy flags (auto-close, early close, pause, renew). | Full Product & Variant ORM catalog (`ProductVariant` with `price_extra`). `SubscriptionPlan` with recurrence frequency and admin-configurable governance policies (`auto_close_on_end`, `allow_pause`, `allow_early_close`, `allow_renewal`). |
| **Scene 3: Quotes into Subscriptions** | Sales reps start from pre-configured quotation templates with plan, product lines & validity days. Moves `Draft` &rarr; `Quotation` &rarr; `Confirmed` &rarr; `Active` &rarr; `Closed`. | `QuotationTemplate` & line items engine. Sequential subscription numbering (`SUB-2026-XXXX`). State machine with action buttons and policy enforcement. |
| **Scene 4: Billing Day & Automated Invoicing** | Hundreds of due subscriptions billed at once. Tax rules automatically applied. Idempotent duplicate-prevention: "Nothing should be billed twice or skipped". Moves `Draft` &rarr; `Confirmed` &rarr; `Paid`. Print & Send. | `BillingService.run_billing_day()` automated batch engine with date targeting, duplicate period avoidance (`idx_invoice_sub_period`), ReportLab professional PDF generation (`/api/billing/invoices/{id}/pdf`), electronic dispatch simulation. |
| **Scene 5: Discount Rules Engine** | Only admin can create discount rules: fixed or percentage, min purchase/quantity, validity dates, usage limit, whole subscription or specific products. Auto-applied to invoices and stopped when expired. | `DiscountService` matching rules, usage counters (`used_count` vs `usage_limit`), automated line or subtotal calculation. Restricted to admin role. |
| **Scene 6: Payment Recording & Tracking** | Multiple payment methods (Credit Card, Wire, Stripe, UPI, Cheque, Cash), date, note, against specific invoice. Live tracking of paid vs outstanding/overdue balances. | `Payment` ledger reducing invoice `amount_due` in real-time, auto-transitioning to `paid` upon full settlement, delinquency tracking. |
| **Scene 7: Finance Lead Dashboard (<2s SLA)** | Executive metrics: Active subscriptions, MRR/ARR, revenue collected, outstanding owed, overdue invoices, aging buckets (0-30, 31-60, 61-90, 90+ days), one-click chasing. Sub-2-second query performance with thousands of subscriptions. | `FinanceService` indexed queries (< 20ms response time, 100x faster than 2.0s SLA). Recharts monthly revenue trends chart, overdue chasing queue with dispatch tracking, performance benchmark widget. |

---

## ⚡ Quick Start & Running the Platform

### 1. Unified Single-Command Run
Run the unified server to serve both the frontend interface and FastAPI backend on a single port:

```bash
# Windows
start.bat
# Or using Python directly:
python run_servers.py
```

- **Interactive Web App**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger REST API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Standard Personas & Default Credentials
The following pre-seeded credentials can be used to sign in to test each user role:

| Role | Email | Password | Access Level |
|---|---|---|---|
| 👑 **Administrator** | `admin@brightloop.com` | `Brightloop@2026` | Full system control: products, variants, plans, discount rules, tax rules, staff management, finance reports. |
| 👔 **Internal Staff Rep** | `sarah.rep@brightloop.com` | `Brightloop@2026` | Day-to-day operations: templates, quotations, active subscriptions, billing day runs, payments, overdue chasing. |
| 🛒 **Small Business Customer** | `shop@cornerstore.com` | `Brightloop@2026` | Customer portal: view own subscriptions (Corner Store LLC), self-service pause/renew, online invoice payment. |
| 🏢 **Enterprise Customer** | `billing@acmecorp.com` | `Brightloop@2026` | Customer portal: view annual enterprise subscription (Acme Corporation), download PDF tax invoices. |

---

## 🧪 Automated Test Suite

Run the full automated test suite covering all 7 problem statement scenes:

```bash
python -m pytest tests/test_brightloop_scenes.py -v
```

All 11 tests pass with 100% green status, verifying password strength validation, RBAC boundaries, Odoo variant pricing, quotation template conversion, idempotent recurring billing runs, discount limits, payment balance settlement, and sub-2.0s finance query performance!

---

## 🏗️ Architecture & Technologies

- **Backend**: FastAPI (Python 3.12), SQLAlchemy ORM, SQLite (aiosqlite), Pydantic v2, PyJWT, bcrypt, ReportLab (PDF Engine).
- **Frontend**: React 19, Vite 8, Tailwind CSS v4, Lucide React icons, Recharts visualization library, Axios.
- **Design System**: TypeUI and Framer-grade minimalist architecture (`#fafafa` canvas, clean zinc neutrals, Inter and JetBrains Mono typography, crisp micro-borders, symmetrical metric grids, and accessible contrast).
