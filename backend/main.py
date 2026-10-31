import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import settings
from backend.seed import seed_database
from backend.routers import (
    auth_router, users_router, products_router, plans_router,
    taxes_router, discounts_router, quotes_router, subscriptions_router,
    billing_router, payments_router, finance_router, portal_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_database()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Unified Subscription Management, Recurring Billing, Quotations & Finance Engine for Brightloop Software (Odoo Hackathon)",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router.router)
app.include_router(users_router.router)
app.include_router(products_router.router)
app.include_router(plans_router.router)
app.include_router(taxes_router.router)
app.include_router(discounts_router.router)
app.include_router(quotes_router.router)
app.include_router(subscriptions_router.router)
app.include_router(billing_router.router)
app.include_router(payments_router.router)
app.include_router(finance_router.router)
app.include_router(portal_router.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

# Mount Frontend static files if build exists
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept API routes
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            return None
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
