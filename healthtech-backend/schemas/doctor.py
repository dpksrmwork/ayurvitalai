from pydantic import BaseModel, Field
from typing import Optional, List

class SpecializationBase(BaseModel):
    name: str
    description: Optional[str] = None

class SpecializationResponse(SpecializationBase):
    id: int

    class Config:
        from_attributes = True

class DoctorProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1)
    phone: Optional[str] = None
    license_number: Optional[str] = Field(None, min_length=1)
    experience_years: Optional[int] = Field(None, ge=0)
    bio: Optional[str] = None
    consultation_fee_cents: Optional[int] = Field(None, ge=0)
    currency: Optional[str] = "usd"
    department: Optional[str] = Field(None, description="Department name, e.g. Cardiology")
    specializations: Optional[List[str]] = Field(None, description="List of specialization names")

class DoctorProfileResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone: Optional[str] = None
    license_number: str
    experience_years: int
    bio: Optional[str] = None
    department: Optional[str] = None
    consultation_fee_cents: int
    currency: str
    is_verified: bool
    specializations: List[SpecializationResponse] = []

    class Config:
        from_attributes = True

class AvailabilitySlotCreate(BaseModel):
    day_of_week: str = Field(..., description="Monday, Tuesday, Wednesday, etc.")
    start_time: str = Field(..., description="HH:MM e.g. 09:00")
    end_time: str = Field(..., description="HH:MM e.g. 17:00")
    slot_duration_minutes: int = Field(30, ge=10, le=120)

class AvailabilitySlotResponse(BaseModel):
    id: int
    doctor_id: int
    day_of_week: str
    start_time: str
    end_time: str
    slot_duration_minutes: int
    is_active: bool

    class Config:
        from_attributes = True
