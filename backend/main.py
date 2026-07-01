from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import machine, master_table, checkpoint, record, defects
from db import engine, Base
from models.models import Machine, MasterTable, Checkpoint, Record

app = FastAPI(
    title="CMF Vibration API",
    description="API for CMF Vibration monitoring system",
    version="1.0.0"
)


# Create tables on startup
@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(machine.router)
app.include_router(master_table.router)
app.include_router(checkpoint.router)
app.include_router(record.router)
app.include_router(defects.router)


@app.get("/")
def root():
    return {
        "message": "CMF Vibration API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
