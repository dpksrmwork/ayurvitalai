from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import datetime
from database import Base


class DoctorScheduleBlock(Base):
    """
    Represents a date range during which a doctor is unavailable.
    All slots that fall within [block_start, block_end] are automatically
    excluded from available booking slots.
    """
    __tablename__ = "doctor_schedule_blocks"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False)
    block_start = Column(Date, nullable=False)   # Start of unavailable period (inclusive)
    block_end = Column(Date, nullable=False)     # End of unavailable period (inclusive)
    reason = Column(String, nullable=True)       # e.g. "Vacation", "Conference", "Personal"
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    doctor = relationship("DoctorProfile", back_populates="schedule_blocks")
