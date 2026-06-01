from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base

from routers.auth import router as auth_router
from routers.doctors import router as doctors_router
from routers.patients import router as patients_router
from routers.appointments import router as appointments_router
from routers.admin import router as admin_router


# Create tables
Base.metadata.create_all(bind=engine)


app = FastAPI(title="HealthTech SaaS Platform API (Gateway)", version="1.0.0")

import os

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(doctors_router)
app.include_router(patients_router)
app.include_router(appointments_router)
app.include_router(admin_router)


@app.get("/")
async def root():
    return {"message": "Welcome to HealthTech SaaS Platform API (Gateway)"}
