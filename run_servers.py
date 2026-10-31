"""
Brightloop Subscription Management System - Unified Server Launcher
"""
import sys
import subprocess
import uvicorn
from pathlib import Path

def main():
    print("=" * 70)
    print("  Brightloop Software - Subscription Management System")
    print("  Unified Enterprise Billing, Quotations & Finance Platform")
    print("=" * 70)

    # 1. Run database seed verification
    from backend.seed import seed_database
    print("\n[1/2] Verifying database and initial seed data...")
    seed_database()

    # 2. Start unified server
    print("\n[2/2] Starting unified web server on http://localhost:8000 ...")
    print("  - Interactive Web Application: http://localhost:8000")
    print("  - Interactive API Swagger Docs: http://localhost:8000/docs")
    print("  - Default Admin: admin@brightloop.com (Password: Brightloop@2026)")
    print("  - Default Staff: sarah.rep@brightloop.com (Password: Brightloop@2026)")
    print("  - Default Customer: shop@cornerstore.com (Password: Brightloop@2026)")
    print("\nPress Ctrl+C to stop the server.\n")

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)

if __name__ == "__main__":
    main()
