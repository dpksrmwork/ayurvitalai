from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
import datetime
from database import Base

class AppointmentStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class AppointmentType(str, enum.Enum):
    IN_PERSON = "in_person"
    TELECONSULTATION = "teleconsultation"

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    appointment_date = Column(DateTime, nullable=False) # Stores date + start time
    start_time = Column(String, nullable=False) # e.g., "10:00"
    end_time = Column(String, nullable=False)   # e.g., "10:30"
    status = Column(String, default=AppointmentStatus.PENDING, nullable=False)
    type = Column(String, default=AppointmentType.IN_PERSON, nullable=False)
    reason = Column(Text, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    fee_cents = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    patient = relationship("PatientProfile", back_populates="appointments")
    doctor = relationship("DoctorProfile", back_populates="appointments")
    notes = relationship("AppointmentNote", back_populates="appointment", cascade="all, delete-orphan")

class AppointmentNote(Base):
    __tablename__ = "appointment_notes"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False) # Admin or Doctor user ID
    notes = Column(Text, nullable=True)
    prescription = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    appointment = relationship("Appointment", back_populates="notes")
