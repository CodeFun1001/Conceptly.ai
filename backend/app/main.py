from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes import auth, sessions, checkpoints, analytics, gamification

app = FastAPI(title="Conceptly API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
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
def on_startup():
    init_db()

@app.get("/")
def read_root():
    return {"message": "Conceptly API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}