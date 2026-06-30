# Expose routers
from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.fields import router as fields_router
from backend.app.api.routes.satellite import router as satellite_router
from backend.app.api.routes.weather import router as weather_router
from backend.app.api.routes.predictions import router as predictions_router
from backend.app.api.routes.irrigation import router as irrigation_router
from backend.app.api.routes.chatbot import router as chatbot_router
from backend.app.api.routes.government import router as government_router
