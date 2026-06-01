from database import Base
from models.user import User, RefreshToken
from models.doctor import DoctorProfile, Specialization, DoctorSpecialization, AvailabilitySlot
from models.patient import PatientProfile
from models.appointment import Appointment, AppointmentNote
from models.schedule_block import DoctorScheduleBlock

# Expose metadata for easy schema generation/migrations
metadata = Base.metadata
