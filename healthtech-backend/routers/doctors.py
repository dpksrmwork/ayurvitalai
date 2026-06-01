from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from database import get_db
from models.user import User, UserRole
from models.doctor import DoctorProfile, AvailabilitySlot, Specialization, DoctorSpecialization
from models.schedule_block import DoctorScheduleBlock
from schemas.doctor import (
    DoctorProfileUpdate,
    DoctorProfileResponse,
    AvailabilitySlotCreate,
    AvailabilitySlotResponse
)
from schemas.schedule_block import ScheduleBlockCreate, ScheduleBlockResponse
from services.doctor_service import get_available_slots
from dependencies import get_current_user, require_role

router = APIRouter(prefix="/doctors", tags=["Doctors"])

@router.put("/profile", response_model=DoctorProfileResponse)
async def update_profile(
    request: DoctorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    profile = current_user.doctor_profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )

    # Update basic profile fields
    if request.full_name is not None:
        profile.full_name = request.full_name
    if request.phone is not None:
        profile.phone = request.phone
    if request.license_number is not None:
        # Check uniqueness of license number
        existing = db.query(DoctorProfile).filter(
            DoctorProfile.license_number == request.license_number,
            DoctorProfile.id != profile.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="License number already registered by another doctor"
            )
        profile.license_number = request.license_number
    if request.experience_years is not None:
        profile.experience_years = request.experience_years
    if request.bio is not None:
        profile.bio = request.bio
    if request.department is not None:
        profile.department = request.department
    if request.consultation_fee_cents is not None:
        profile.consultation_fee_cents = request.consultation_fee_cents
    if request.currency is not None:
        profile.currency = request.currency

    # Update specializations if provided
    if request.specializations is not None:
        # Clear existing specializations
        profile.specializations.clear()
        
        # Add new/existing ones
        for spec_name in request.specializations:
            spec = db.query(Specialization).filter(Specialization.name == spec_name).first()
            if not spec:
                spec = Specialization(name=spec_name)
                db.add(spec)
                db.commit()
                db.refresh(spec)
            profile.specializations.append(spec)

    db.commit()
    db.refresh(profile)
    return profile

@router.get("/profile", response_model=DoctorProfileResponse)
async def get_own_profile(current_user: User = Depends(require_role([UserRole.DOCTOR]))):
    if not current_user.doctor_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    return current_user.doctor_profile

@router.get("", response_model=List[DoctorProfileResponse])
async def list_doctors(
    specialization: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    is_verified: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(DoctorProfile)

    if is_verified is not None:
        query = query.filter(DoctorProfile.is_verified == is_verified)

    if department:
        query = query.filter(DoctorProfile.department.ilike(f"%{department}%"))

    if specialization:
        query = query.join(DoctorProfile.specializations).filter(
            Specialization.name.ilike(f"%{specialization}%")
        )

    if search:
        query = query.filter(
            (DoctorProfile.full_name.ilike(f"%{search}%")) |
            (DoctorProfile.bio.ilike(f"%{search}%")) |
            (DoctorProfile.department.ilike(f"%{search}%"))
        )

    return query.all()

@router.get("/{doctor_id}", response_model=DoctorProfileResponse)
async def get_doctor_detail(doctor_id: int, db: Session = Depends(get_db)):
    profile = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    return profile

# ─── Availability Slot Endpoints ─────────────────────────────────────────────

@router.post("/availability", response_model=AvailabilitySlotResponse, status_code=status.HTTP_201_CREATED)
async def add_availability(
    request: AvailabilitySlotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    # Validate day of week
    valid_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day = request.day_of_week.capitalize()
    if day not in valid_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid day of week. Must be Monday, Tuesday, etc."
        )

    # Simple time format validations (HH:MM)
    for t in [request.start_time, request.end_time]:
        try:
            h, m = map(int, t.split(":"))
            if not (0 <= h < 24 and 0 <= m < 60):
                raise ValueError()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Time must be in HH:MM format (24 hour)"
            )

    new_slot = AvailabilitySlot(
        doctor_id=current_user.doctor_profile.id,
        day_of_week=day,
        start_time=request.start_time,
        end_time=request.end_time,
        slot_duration_minutes=request.slot_duration_minutes
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)
    return new_slot

@router.get("/{doctor_id}/availability", response_model=List[AvailabilitySlotResponse])
async def get_doctor_availability_schedule(doctor_id: int, db: Session = Depends(get_db)):
    slots = db.query(AvailabilitySlot).filter(
        AvailabilitySlot.doctor_id == doctor_id,
        AvailabilitySlot.is_active == True
    ).all()
    return slots

@router.delete("/availability/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_availability(
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    slot = db.query(AvailabilitySlot).filter(
        AvailabilitySlot.id == slot_id,
        AvailabilitySlot.doctor_id == current_user.doctor_profile.id
    ).first()

    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Availability slot not found"
        )

    db.delete(slot)
    db.commit()
    return None

@router.get("/{doctor_id}/slots/{date}")
async def get_slots_for_date(doctor_id: int, date: str, db: Session = Depends(get_db)):
    """
    Get available booking slots (start_time, end_time) for a doctor on a specific date (YYYY-MM-DD).
    Automatically excludes slots if the date falls within a schedule block.
    """
    slots = get_available_slots(db, doctor_id, date)
    return {"slots": slots}

# ─── Schedule Block Endpoints (Doctor Cancellation/Unavailability) ────────────

@router.post("/schedule-blocks", response_model=ScheduleBlockResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule_block(
    request: ScheduleBlockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """
    Create a schedule block — marks a date range as unavailable.
    All slots within [block_start, block_end] will be excluded from booking.
    """
    if request.block_end < request.block_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="block_end must be on or after block_start"
        )

    block = DoctorScheduleBlock(
        doctor_id=current_user.doctor_profile.id,
        block_start=request.block_start,
        block_end=request.block_end,
        reason=request.reason
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    return block

@router.get("/{doctor_id}/schedule-blocks", response_model=List[ScheduleBlockResponse])
async def list_schedule_blocks(doctor_id: int, db: Session = Depends(get_db)):
    """List all active (current and future) schedule blocks for a doctor."""
    today = datetime.date.today()
    blocks = db.query(DoctorScheduleBlock).filter(
        DoctorScheduleBlock.doctor_id == doctor_id,
        DoctorScheduleBlock.block_end >= today
    ).order_by(DoctorScheduleBlock.block_start).all()
    return blocks

@router.delete("/schedule-blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule_block(
    block_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    """Remove a schedule block to make slots available again."""
    block = db.query(DoctorScheduleBlock).filter(
        DoctorScheduleBlock.id == block_id,
        DoctorScheduleBlock.doctor_id == current_user.doctor_profile.id
    ).first()

    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule block not found"
        )

    db.delete(block)
    db.commit()
    return None
