from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from database import get_db
from models.user import User, UserRole
from models.doctor import DoctorProfile
from models.patient import PatientProfile
from models.appointment import Appointment, AppointmentStatus
from schemas.auth import UserMeResponse
from schemas.doctor import DoctorProfileResponse
from dependencies import require_role

router = APIRouter(prefix="/admin", tags=["Admin Module"])

@router.get("/users", response_model=List[UserMeResponse])
async def list_all_users(
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    query = db.query(User)
    
    if role is not None:
        query = query.filter(User.role == role)
        
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
        
    users = query.all()
    
    results = []
    for u in users:
        full_name = u.email  # Default fallback for admin or users without profiles
        doctor_profile_id = None
        is_verified = None
        if u.role == UserRole.DOCTOR and u.doctor_profile:
            full_name = u.doctor_profile.full_name
            doctor_profile_id = u.doctor_profile.id
            is_verified = u.doctor_profile.is_verified
        elif u.role == UserRole.PATIENT and u.patient_profile:
            full_name = u.patient_profile.full_name
            
        results.append({
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "full_name": full_name,
            "doctor_profile_id": doctor_profile_id,
            "is_verified": is_verified
        })
        
    return results

@router.put("/users/{user_id}/activate")
async def toggle_user_active(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_active = is_active
    db.commit()
    
    status_str = "activated" if is_active else "deactivated"
    return {"message": f"User account successfully {status_str}"}

@router.put("/doctors/{doctor_id}/verify", response_model=DoctorProfileResponse)
async def verify_doctor(
    doctor_id: int,
    is_verified: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
        
    doctor.is_verified = is_verified
    db.commit()
    db.refresh(doctor)
    return doctor

@router.get("/stats")
async def get_platform_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    total_users = db.query(func.count(User.id)).scalar()
    total_doctors = db.query(func.count(DoctorProfile.id)).scalar()
    total_patients = db.query(func.count(PatientProfile.id)).scalar()
    
    # Appointments status count
    appt_stats = db.query(
        Appointment.status, func.count(Appointment.id)
    ).group_by(Appointment.status).all()
    
    appointments_by_status = {status: count for status, count in appt_stats} if appt_stats else {}
    for status_enum in AppointmentStatus:
        if status_enum.value not in appointments_by_status:
            appointments_by_status[status_enum.value] = 0


    return {
        "users": {
            "total": total_users,
            "doctors": total_doctors,
            "patients": total_patients
        },
        "appointments": appointments_by_status
    }
