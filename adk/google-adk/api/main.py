"""
FastAPI Main Application
Exposes ADK agents as HTTP endpoints for the Node.js backend to consume
"""

import os
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from api.routes import router as api_router
from websocket_client import ws_client

# Load environment variables
load_dotenv()

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'INFO')
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown"""
    # Startup
    logger.info("Starting Memoral ADK Service...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Backend API URL: {os.getenv('BACKEND_API_URL', 'http://localhost:8000')}")

    # Verify Google API key is set
    if not os.getenv('GOOGLE_API_KEY'):
        logger.warning("GOOGLE_API_KEY not set - AI features may not work properly")
    else:
        logger.info("Google API key configured")

    # Initialize WebSocket connection to backend
    logger.info("Initializing WebSocket connection to backend...")
    if ws_client.connect():
        logger.info("WebSocket connection established - real-time updates enabled")
    else:
        logger.warning("WebSocket connection failed - real-time updates disabled")

    yield

    # Shutdown
    logger.info("Shutting down Memoral ADK Service...")
    ws_client.disconnect()


# Create FastAPI application
app = FastAPI(
    title="Memoral ADK Service",
    description="AI-Powered Multi-Agent System for Alzheimer's Care",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
cors_origins = [
    "http://localhost:8000",  # Node.js backend
    "http://localhost:3000",  # Next.js frontend (for direct calls if needed)
    os.getenv('BACKEND_API_URL', 'http://localhost:8000'),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)


@app.get("/health")
async def health_check():
    """
    Health check endpoint
    Returns service status and available agents
    """
    return {
        "status": "healthy",
        "service": "memoral-adk",
        "timestamp": datetime.now().isoformat(),
        "agents": ["memory", "task", "health", "supervisor"],
        "model": os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp'),
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Memoral ADK Service",
        "description": "AI-Powered Multi-Agent System for Alzheimer's Care",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv('PORT', 5000))
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level=log_level.lower()
    )
