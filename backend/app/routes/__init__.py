from app.routes.admin import router as admin_router
from app.routes.alerts import router as alerts_router
from app.routes.lookup import router as lookup_router
from app.routes.map import router as map_router
from app.routes.reports import router as reports_router

__all__ = ["lookup_router", "reports_router", "admin_router", "map_router", "alerts_router"]
