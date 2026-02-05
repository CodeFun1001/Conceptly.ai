from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import auth, sessions, checkpoints, analytics, gamification
import os

app = FastAPI(title="Conceptly API", version="1.0.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        FRONTEND_URL,
        "https://*.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(checkpoints.router)
app.include_router(analytics.router)
app.include_router(gamification.router)

@app.on_event("startup")
async def on_startup():
    print("Starting Conceptly API")
    print(f"Running on Render: {bool(os.getenv('RENDER'))}")
    print(f"DB configured: {bool(os.getenv('DATABASE_URL'))}")

    init_db()
    
    print("Startup complete!")

@app.get("/")
def read_root():
    return {
        "message": "Conceptly API is running!",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/db-status")
def database_status():
    from sqlalchemy import text
    from app.database import engine
    
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            return {"database": "connected", "status": " Done "}
    except Exception as e:
        return {"database": "error", "error": str(e), "status": " Failed "}