from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.db.session import engine, Base
from backend.app.api.routes import (
    auth_router,
    fields_router,
    satellite_router,
    weather_router,
    predictions_router,
    irrigation_router,
    chatbot_router,
    government_router
)
import asyncio

app = FastAPI(
    title="KrishiSaarthi AI - Precision Agriculture API",
    description="Backend services for GIS-based Precision Agriculture advisories, AI predictions, and multilingual chat.",
    version="1.0.0"
)

# Configure CORS for Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for local development and testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup routine to create SQLite tables automatically if local
@app.on_event("startup")
async def startup_event():
    # Attempt to create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Register routers under "/api"
app.include_router(auth_router, prefix="/api")
app.include_router(fields_router, prefix="/api")
app.include_router(satellite_router, prefix="/api")
app.include_router(weather_router, prefix="/api")
app.include_router(predictions_router, prefix="/api")
app.include_router(irrigation_router, prefix="/api")
app.include_router(chatbot_router, prefix="/api")
app.include_router(government_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "KrishiSaarthi AI Precision Agriculture API",
        "documentation": "/docs"
    }
