from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User, UserRole
from schemas.patient import PatientProfileUpdate, PatientProfileResponse
from dependencies import require_role

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.put("/profile", response_model=PatientProfileResponse)
async def update_profile(
    request: PatientProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PATIENT]))
):
    profile = current_user.patient_profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )

    if request.full_name is not None:
        profile.full_name = request.full_name
    if request.phone is not None:
        profile.phone = request.phone
    if request.date_of_birth is not None:
        profile.date_of_birth = request.date_of_birth
    if request.gender is not None:
        profile.gender = request.gender
    if request.blood_group is not None:
        profile.blood_group = request.blood_group
    if request.medical_history is not None:
        profile.medical_history = request.medical_history
    if request.allergies is not None:
        profile.allergies = request.allergies

    db.commit()
    db.refresh(profile)
    return profile

@router.get("/profile", response_model=PatientProfileResponse)
async def get_own_profile(current_user: User = Depends(require_role([UserRole.PATIENT]))):
    if not current_user.patient_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    return current_user.patient_profile
