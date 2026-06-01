import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Notifications")

def send_booking_notification(doctor_email: str, patient_name: str, date_str: str, time_str: str):
    logger.info(f"✉️ Sending Email to Doctor ({doctor_email}): Patient {patient_name} has requested an appointment on {date_str} at {time_str}.")

def send_confirmation_notification(patient_email: str, doctor_name: str, date_str: str, time_str: str):
    logger.info(f"✉️ Sending Email to Patient ({patient_email}): Your appointment with Dr. {doctor_name} on {date_str} at {time_str} is CONFIRMED.")

def send_cancellation_notification(recipient_email: str, role: str, details: str):
    logger.info(f"✉️ Sending Email to {role} ({recipient_email}): Appointment has been CANCELLED. Details: {details}")
