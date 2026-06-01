from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from database import get_db
from models.user import User, UserRole
from models.appointment import Appointment, AppointmentStatus, AppointmentNote
from models.patient import PatientProfile
from schemas.appointment import (
    BookAppointmentRequest,
    GuestBookAppointmentRequest,
    AppointmentResponse,
    AppointmentNoteCreate,
    AppointmentNoteResponse
)
from services.appointment_service import book_appointment
from services.notification_service import send_confirmation_notification, send_cancellation_notification
from services.auth_service import hash_password
from dependencies import require_role
import secrets

router = APIRouter(prefix="/appointments", tags=["Appointments"])

@router.post("/guest", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_guest_booking(
    request: GuestBookAppointmentRequest,
    db: Session = Depends(get_db)
):
    # Check if user already exists
    user = db.query(User).filter(User.email == request.patient_email).first()
    if not user:
        # Create shadow user
        random_pass = secrets.token_hex(8)
        user = User(
            email=request.patient_email,
            password_hash=hash_password(random_pass),
            role=UserRole.PATIENT
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Check if patient profile exists
    patient_profile = db.query(PatientProfile).filter(PatientProfile.user_id == user.id).first()
    if not patient_profile:
        patient_profile = PatientProfile(
            user_id=user.id,
            full_name=request.patient_name,
            phone=request.patient_phone
        )
        db.add(patient_profile)
        db.commit()
        db.refresh(patient_profile)
    else:
        if request.patient_phone:
            patient_profile.phone = request.patient_phone
        if request.patient_name:
            patient_profile.full_name = request.patient_name
        db.commit()

    return book_appointment(
        db=db,
        patient_id=patient_profile.id,
        doctor_id=request.doctor_id,
        appointment_date=request.appointment_date,
        reason=request.reason,
        appt_type=request.type
    )

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    request: BookAppointmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PATIENT]))
):
    patient_profile = current_user.patient_profile
    if not patient_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your patient profile before booking appointments"
        )
        
    return book_appointment(
        db=db,
        patient_id=patient_profile.id,
        doctor_id=request.doctor_id,
        appointment_date=request.appointment_date,
        reason=request.reason,
        appt_type=request.type
    )

@router.get("", response_model=List[AppointmentResponse])
async def list_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PATIENT, UserRole.DOCTOR]))
):
    if current_user.role == UserRole.PATIENT:
        profile = current_user.patient_profile
        if not profile:
            return []
        return db.query(Appointment).filter(Appointment.patient_id == profile.id).all()
        
    elif current_user.role == UserRole.DOCTOR:
        profile = current_user.doctor_profile
        if not profile:
            return []
        return db.query(Appointment).filter(Appointment.doctor_id == profile.id).all()

@router.get("/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PATIENT, UserRole.DOCTOR]))
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )

    # Check authorization
    if current_user.role == UserRole.PATIENT:
        if appointment.patient_id != current_user.patient_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role == UserRole.DOCTOR:
        if appointment.doctor_id != current_user.doctor_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return appointment

@router.put("/{appointment_id}/confirm", response_model=AppointmentResponse)
async def confirm_booking(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.doctor_id == current_user.doctor_profile.id
    ).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )

    if appointment.status != AppointmentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Appointment cannot be confirmed from status: {appointment.status}"
        )

    appointment.status = AppointmentStatus.CONFIRMED
    db.commit()
    db.refresh(appointment)

    # Trigger notification
    patient_email = appointment.patient.user.email
    doctor_name = appointment.doctor.full_name
    date_str = appointment.appointment_date.strftime("%Y-%m-%d")
    send_confirmation_notification(patient_email, doctor_name, date_str, appointment.start_time)

    return appointment

@router.put("/{appointment_id}/complete", response_model=AppointmentResponse)
async def complete_booking(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.doctor_id == current_user.doctor_profile.id
    ).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )

    if appointment.status != AppointmentStatus.CONFIRMED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only confirmed appointments can be completed"
        )

    appointment.status = AppointmentStatus.COMPLETED
    db.commit()
    db.refresh(appointment)
    return appointment

@router.put("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_booking(
    appointment_id: int,
    cancellation_reason: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PATIENT, UserRole.DOCTOR]))
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )

    # Authorization check
    if current_user.role == UserRole.PATIENT:
        if appointment.patient_id != current_user.patient_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role == UserRole.DOCTOR:
        if appointment.doctor_id != current_user.doctor_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if appointment.status in [AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel appointment with status: {appointment.status}"
        )

    appointment.status = AppointmentStatus.CANCELLED
    appointment.cancellation_reason = cancellation_reason
    db.commit()
    db.refresh(appointment)

    # Notify counterpart
    recipient_email = ""
    role = ""
    if current_user.role == UserRole.PATIENT:
        recipient_email = appointment.doctor.user.email
        role = "Doctor"
    else:
        recipient_email = appointment.patient.user.email
        role = "Patient"

    details = f"Cancelled by {current_user.role}. Reason: {cancellation_reason or 'None'}"
    send_cancellation_notification(recipient_email, role, details)

    return appointment

@router.post("/{appointment_id}/notes", response_model=AppointmentNoteResponse, status_code=status.HTTP_201_CREATED)
async def add_notes(
    appointment_id: int,
    request: AppointmentNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DOCTOR]))
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.doctor_id == current_user.doctor_profile.id
    ).first()

    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )

    new_note = AppointmentNote(
        appointment_id=appointment.id,
        created_by=current_user.id,
        notes=request.notes,
        prescription=request.prescription
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.get("/{appointment_id}/notes", response_model=List[AppointmentNoteResponse])
async def get_notes(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.PATIENT, UserRole.DOCTOR]))
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )

    # Auth check
    if current_user.role == UserRole.PATIENT:
        if appointment.patient_id != current_user.patient_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif current_user.role == UserRole.DOCTOR:
        if appointment.doctor_id != current_user.doctor_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return appointment.notes
