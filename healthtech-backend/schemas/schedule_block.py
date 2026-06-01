from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class ScheduleBlockCreate(BaseModel):
    block_start: date = Field(..., description="Start date of unavailability (inclusive), YYYY-MM-DD")
    block_end: date = Field(..., description="End date of unavailability (inclusive), YYYY-MM-DD")
    reason: Optional[str] = Field(None, description="Reason for blocking, e.g. 'Vacation'")


class ScheduleBlockResponse(BaseModel):
    id: int
    doctor_id: int
    block_start: date
    block_end: date
    reason: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
