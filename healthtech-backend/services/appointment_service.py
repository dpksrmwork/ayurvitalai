import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.doctor import DoctorProfile
from models.appointment import Appointment, AppointmentStatus, AppointmentType
from services.doctor_service import get_available_slots
from services.notification_service import send_booking_notification

def book_appointment(
    db: Session,
    patient_id: int,
    doctor_id: int,
    appointment_date: datetime.datetime,
    reason: str = None,
    appt_type: str = "in_person"
) -> Appointment:
    # 1. Fetch Doctor Profile
    doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )

    # Convert appointment_date to string date and HH:MM start time
    date_str = appointment_date.strftime("%Y-%m-%d")
    start_time_str = appointment_date.strftime("%H:%M")

    # 2. Check if Doctor is Available at this time
    available_slots = get_available_slots(db, doctor_id, date_str)
    
    selected_slot = None
    for slot in available_slots:
        if slot["start_time"] == start_time_str:
            selected_slot = slot
            break

    if not selected_slot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Doctor is not available at {start_time_str} on {date_str}."
        )

    # 3. Calculate end time based on the doctor's slot duration (usually 30 mins)
    # Let's read slot duration for that day of the week
    day_of_week = appointment_date.strftime("%A")
    # find the slot duration
    active_slot = [s for s in doctor.availability_slots if s.day_of_week == day_of_week and s.is_active][0]
    duration = active_slot.slot_duration_minutes
    
    end_time_dt = appointment_date + datetime.timedelta(minutes=duration)
    end_time_str = end_time_dt.strftime("%H:%M")

    # 4. Create the Appointment record
    new_appointment = Appointment(
        patient_id=patient_id,
        doctor_id=doctor_id,
        appointment_date=appointment_date,
        start_time=start_time_str,
        end_time=end_time_str,
        status=AppointmentStatus.PENDING,
        type=appt_type,
        reason=reason,
        fee_cents=doctor.consultation_fee_cents
    )
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    # 5. Trigger notification to Doctor
    doctor_email = doctor.user.email
    patient_name = new_appointment.patient.full_name
    send_booking_notification(doctor_email, patient_name, date_str, start_time_str)

    return new_appointment
