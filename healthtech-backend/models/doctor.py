from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class DoctorSpecialization(Base):
    __tablename__ = "doctor_specializations"

    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), primary_key=True)
    specialization_id = Column(Integer, ForeignKey("specializations.id", ondelete="CASCADE"), primary_key=True)

class Specialization(Base):
    __tablename__ = "specializations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    license_number = Column(String, unique=True, index=True, nullable=False)
    experience_years = Column(Integer, default=0)
    bio = Column(Text, nullable=True)
    department = Column(String, nullable=True)  # e.g. "Cardiology", "Orthopedics"
    consultation_fee_cents = Column(Integer, default=0, nullable=False)
    currency = Column(String, default="usd", nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="doctor_profile")
    specializations = relationship("Specialization", secondary="doctor_specializations")
    availability_slots = relationship("AvailabilitySlot", back_populates="doctor", cascade="all, delete-orphan")
    schedule_blocks = relationship("DoctorScheduleBlock", back_populates="doctor", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="doctor")

class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(String, nullable=False) # e.g. "Monday", "Tuesday"
    start_time = Column(String, nullable=False)  # HH:MM e.g. "09:00"
    end_time = Column(String, nullable=False)    # HH:MM e.g. "17:00"
    slot_duration_minutes = Column(Integer, default=30, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    doctor = relationship("DoctorProfile", back_populates="availability_slots")
