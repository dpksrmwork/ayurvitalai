from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from schemas.doctor import DoctorProfileResponse
from schemas.patient import PatientProfileResponse

class BookAppointmentRequest(BaseModel):
    doctor_id: int
    appointment_date: datetime = Field(..., description="Date and time of appointment, e.g. YYYY-MM-DDTHH:MM:SS")
    reason: Optional[str] = None
    type: Optional[str] = "in_person" # or "teleconsultation"

class GuestBookAppointmentRequest(BaseModel):
    doctor_id: int
    appointment_date: datetime = Field(..., description="Date and time of appointment")
    reason: Optional[str] = None
    type: Optional[str] = "in_person"
    patient_name: str
    patient_email: str
    patient_phone: Optional[str] = None

class AppointmentNoteCreate(BaseModel):
    notes: Optional[str] = None
    prescription: Optional[str] = None

class AppointmentNoteResponse(BaseModel):
    id: int
    appointment_id: int
    created_by: int
    notes: Optional[str] = None
    prescription: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    start_time: str
    end_time: str
    status: str
    type: str
    reason: Optional[str] = None
    cancellation_reason: Optional[str] = None
    fee_cents: int
    created_at: datetime
    notes: List[AppointmentNoteResponse] = []
    doctor: Optional[DoctorProfileResponse] = None
    patient: Optional[PatientProfileResponse] = None

    class Config:
        from_attributes = True
