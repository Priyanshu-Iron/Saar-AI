import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import allowed_origins, check_config
from app.routers import auth, meetings, generate
from app.db.init_saarai_tables import init_saarai_tables

app = FastAPI(
    title="SaarAI",
    description="AI-Powered Meeting Intelligence — MOM, Insights & Strategy",
    version="1.0.0",
)

# Check config and create SaarAI tables on startup. Tests set SAARAI_SKIP_DB_INIT=1.
if os.getenv("SAARAI_SKIP_DB_INIT") != "1":
    check_config()
    init_saarai_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(meetings.router)
app.include_router(generate.router)

@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "running",
        "service": "SaarAI",
        "version": "1.0.0"
    }
