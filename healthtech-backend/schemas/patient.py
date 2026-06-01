from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class PatientProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1)
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = Field(None, description="Male, Female, or Other")
    blood_group: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None

class PatientProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None

    class Config:
        from_attributes = True
