import datetime
from sqlalchemy.orm import Session
from models.doctor import DoctorProfile, AvailabilitySlot, Specialization
from models.appointment import Appointment, AppointmentStatus
from models.schedule_block import DoctorScheduleBlock

def get_available_slots(db: Session, doctor_id: int, date_str: str) -> list[dict]:
    """
    Given a doctor ID and a date string (YYYY-MM-DD),
    returns a list of available time slots.

    Slots are UNAVAILABLE if:
    1. The date falls within any DoctorScheduleBlock range
    2. The slot is already booked (pending/confirmed appointment)
    3. No availability template exists for that day of the week
    """
    try:
        target_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return []

    # ── Check schedule blocks: if any block covers this date, return empty ──
    block_exists = db.query(DoctorScheduleBlock).filter(
        DoctorScheduleBlock.doctor_id == doctor_id,
        DoctorScheduleBlock.block_start <= target_date,
        DoctorScheduleBlock.block_end >= target_date
    ).first()

    if block_exists:
        return []  # Entire day is blocked

    day_of_week = target_date.strftime("%A")

    # Get active availability slots for this day of the week
    slots = db.query(AvailabilitySlot).filter(
        AvailabilitySlot.doctor_id == doctor_id,
        AvailabilitySlot.day_of_week == day_of_week,
        AvailabilitySlot.is_active == True
    ).all()

    # Get confirmed/pending appointments on this date
    start_of_day = datetime.datetime.combine(target_date, datetime.time.min)
    end_of_day = datetime.datetime.combine(target_date, datetime.time.max)

    booked_appointments = db.query(Appointment).filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date >= start_of_day,
        Appointment.appointment_date <= end_of_day,
        Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED])
    ).all()

    booked_times = {appt.start_time for appt in booked_appointments}

    available_intervals = []

    for slot in slots:
        # Convert start/end times to minutes since midnight for easy slicing
        try:
            sh, sm = map(int, slot.start_time.split(":"))
            eh, em = map(int, slot.end_time.split(":"))
        except ValueError:
            continue

        start_min = sh * 60 + sm
        end_min = eh * 60 + em
        duration = slot.slot_duration_minutes

        current_min = start_min
        while current_min + duration <= end_min:
            slot_start_h = current_min // 60
            slot_start_m = current_min % 60
            slot_start_str = f"{slot_start_h:02d}:{slot_start_m:02d}"

            slot_end_h = (current_min + duration) // 60
            slot_end_m = (current_min + duration) % 60
            slot_end_str = f"{slot_end_h:02d}:{slot_end_m:02d}"

            if slot_start_str not in booked_times:
                available_intervals.append({
                    "start_time": slot_start_str,
                    "end_time": slot_end_str
                })

            current_min += duration

    return available_intervals
