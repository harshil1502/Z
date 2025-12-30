"""
API routes for Z - Financial Intel.
"""

from fastapi import APIRouter

from app.api.routes import auth, flow, options, analytics, alerts, users

router = APIRouter()

# Include all route modules
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(flow.router, prefix="/flow", tags=["Options Flow"])
router.include_router(options.router, prefix="/options", tags=["Options Data"])
router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
router.include_router(users.router, prefix="/users", tags=["Users"])
