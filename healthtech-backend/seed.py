"""
Seed script for HealthTech SaaS Platform.
Creates demo users, doctor profiles, patient profiles, specializations,
availability slots, and sample appointments.

Usage:
    cd healthtech-backend
    python seed.py
"""
import os
import sys
import datetime

# Ensure we can import from the project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import Base
from models.user import User, UserRole
from models.doctor import DoctorProfile, Specialization, AvailabilitySlot
from models.patient import PatientProfile
from models.appointment import Appointment, AppointmentStatus
from models.schedule_block import DoctorScheduleBlock
from services.auth_service import hash_password


def seed():
    # Drop and recreate all tables for a clean slate
    print("🔄 Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # ─── Specializations ─────────────────────────────────────────────
        print("🏷️  Creating specializations...")
        specs = {}
        spec_data = [
            ("General Medicine", "Primary care and general health"),
            ("Cardiology", "Heart and cardiovascular system"),
            ("Dermatology", "Skin, hair, and nail conditions"),
            ("Orthopedics", "Bones, joints, and musculoskeletal system"),
            ("Pediatrics", "Children's health and development"),
            ("Neurology", "Brain and nervous system disorders"),
            ("Ayurveda", "Traditional Indian medicine system"),
            ("Psychiatry", "Mental health and behavioral disorders"),
        ]
        for name, desc in spec_data:
            s = Specialization(name=name, description=desc)
            db.add(s)
            specs[name] = s
        db.commit()
        for s in specs.values():
            db.refresh(s)

        # ─── Admin User ──────────────────────────────────────────────────
        print("👤 Creating admin user...")
        admin_user = User(
            email="admin@healthtech.com",
            password_hash=hash_password("adminpassword"),
            role=UserRole.ADMIN
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        # ─── Doctor Users ────────────────────────────────────────────────
        print("🩺 Creating doctor users and profiles...")
        doctors_data = [
            {
                "email": "doctor1@healthtech.com",
                "password": "password123",
                "full_name": "Dr. Anika Sharma",
                "license_number": "MED-2024-001",
                "experience_years": 12,
                "bio": "Board-certified cardiologist with expertise in interventional cardiology and preventive heart care.",
                "department": "Cardiology",
                "consultation_fee_cents": 15000,
                "currency": "inr",
                "is_verified": True,
                "specializations": ["Cardiology", "General Medicine"],
                "availability": [
                    {"day": "Monday", "start": "09:00", "end": "17:00", "duration": 30},
                    {"day": "Wednesday", "start": "09:00", "end": "17:00", "duration": 30},
                    {"day": "Friday", "start": "10:00", "end": "14:00", "duration": 30},
                ],
            },
            {
                "email": "doctor2@healthtech.com",
                "password": "password123",
                "full_name": "Dr. Rajesh Patel",
                "license_number": "MED-2024-002",
                "experience_years": 8,
                "bio": "Experienced dermatologist specializing in cosmetic dermatology and skin cancer screening.",
                "department": "Dermatology",
                "consultation_fee_cents": 12000,
                "currency": "inr",
                "is_verified": True,
                "specializations": ["Dermatology"],
                "availability": [
                    {"day": "Tuesday", "start": "09:00", "end": "16:00", "duration": 30},
                    {"day": "Thursday", "start": "09:00", "end": "16:00", "duration": 30},
                    {"day": "Saturday", "start": "10:00", "end": "13:00", "duration": 30},
                ],
            },
            {
                "email": "doctor3@healthtech.com",
                "password": "password123",
                "full_name": "Dr. Priya Menon",
                "license_number": "MED-2024-003",
                "experience_years": 15,
                "bio": "Senior orthopedic surgeon with specialization in sports medicine and joint replacement.",
                "department": "Orthopedics",
                "consultation_fee_cents": 20000,
                "currency": "inr",
                "is_verified": True,
                "specializations": ["Orthopedics"],
                "availability": [
                    {"day": "Monday", "start": "10:00", "end": "18:00", "duration": 45},
                    {"day": "Tuesday", "start": "10:00", "end": "18:00", "duration": 45},
                    {"day": "Thursday", "start": "10:00", "end": "15:00", "duration": 45},
                ],
            },
            {
                "email": "doctor4@healthtech.com",
                "password": "password123",
                "full_name": "Dr. Vikram Ayur",
                "license_number": "MED-2024-004",
                "experience_years": 20,
                "bio": "Renowned Ayurvedic practitioner combining traditional healing with modern diagnostic techniques.",
                "department": "Ayurveda & Integrative Medicine",
                "consultation_fee_cents": 10000,
                "currency": "inr",
                "is_verified": False,
                "specializations": ["Ayurveda", "General Medicine"],
                "availability": [
                    {"day": "Monday", "start": "08:00", "end": "14:00", "duration": 60},
                    {"day": "Wednesday", "start": "08:00", "end": "14:00", "duration": 60},
                    {"day": "Friday", "start": "08:00", "end": "14:00", "duration": 60},
                ],
            },
        ]

        doctor_profiles = []
        for doc_data in doctors_data:
            user = User(
                email=doc_data["email"],
                password_hash=hash_password(doc_data["password"]),
                role=UserRole.DOCTOR
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            profile = DoctorProfile(
                user_id=user.id,
                full_name=doc_data["full_name"],
                license_number=doc_data["license_number"],
                experience_years=doc_data["experience_years"],
                bio=doc_data["bio"],
                department=doc_data["department"],
                consultation_fee_cents=doc_data["consultation_fee_cents"],
                currency=doc_data["currency"],
                is_verified=doc_data["is_verified"],
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)

            # Add specializations
            for spec_name in doc_data["specializations"]:
                profile.specializations.append(specs[spec_name])
            db.commit()

            # Add availability slots
            for avail in doc_data["availability"]:
                slot = AvailabilitySlot(
                    doctor_id=profile.id,
                    day_of_week=avail["day"],
                    start_time=avail["start"],
                    end_time=avail["end"],
                    slot_duration_minutes=avail["duration"],
                )
                db.add(slot)
            db.commit()

            doctor_profiles.append(profile)

        # ─── Patient Users ───────────────────────────────────────────────
        print("🧑 Creating patient users and profiles...")
        patients_data = [
            {
                "email": "patient1@healthtech.com",
                "password": "password123",
                "full_name": "Rohan Kapoor",
                "phone": "+91-9876543210",
                "gender": "Male",
                "blood_group": "O+",
            },
            {
                "email": "patient2@healthtech.com",
                "password": "password123",
                "full_name": "Meera Joshi",
                "phone": "+91-9876543211",
                "gender": "Female",
                "blood_group": "A+",
            },
        ]

        patient_profiles = []
        for pat_data in patients_data:
            user = User(
                email=pat_data["email"],
                password_hash=hash_password(pat_data["password"]),
                role=UserRole.PATIENT
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            profile = PatientProfile(
                user_id=user.id,
                full_name=pat_data["full_name"],
                phone=pat_data["phone"],
                gender=pat_data["gender"],
                blood_group=pat_data["blood_group"],
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            patient_profiles.append(profile)

        # ─── Sample Schedule Block ───────────────────────────────────────
        print("🚫 Creating sample schedule block...")
        # Doctor 1 is on vacation next week
        today = datetime.date.today()
        block = DoctorScheduleBlock(
            doctor_id=doctor_profiles[0].id,
            block_start=today + datetime.timedelta(days=7),
            block_end=today + datetime.timedelta(days=14),
            reason="Annual vacation"
        )
        db.add(block)
        db.commit()

        # ─── Sample Appointments ─────────────────────────────────────────
        print("📅 Creating sample appointments...")
        # Find next Monday for a realistic appointment date
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = today + datetime.timedelta(days=days_until_monday)

        appt1 = Appointment(
            patient_id=patient_profiles[0].id,
            doctor_id=doctor_profiles[0].id,
            appointment_date=datetime.datetime.combine(next_monday, datetime.time(10, 0)),
            start_time="10:00",
            end_time="10:30",
            status=AppointmentStatus.PENDING,
            type="in_person",
            reason="Regular heart checkup",
            fee_cents=doctor_profiles[0].consultation_fee_cents,
        )
        db.add(appt1)

        appt2 = Appointment(
            patient_id=patient_profiles[1].id,
            doctor_id=doctor_profiles[1].id,
            appointment_date=datetime.datetime.combine(
                today + datetime.timedelta(days=(1 - today.weekday()) % 7 or 7),
                datetime.time(11, 0)
            ),
            start_time="11:00",
            end_time="11:30",
            status=AppointmentStatus.CONFIRMED,
            type="in_person",
            reason="Skin rash consultation",
            fee_cents=doctor_profiles[1].consultation_fee_cents,
        )
        db.add(appt2)

        db.commit()

        print("\n✅ Seed data created successfully!")
        print("=" * 50)
        print("📋 Demo Credentials:")
        print("-" * 50)
        print(f"  Admin:    admin@healthtech.com / adminpassword")
        print(f"  Doctor 1: doctor1@healthtech.com / password123")
        print(f"  Doctor 2: doctor2@healthtech.com / password123")
        print(f"  Doctor 3: doctor3@healthtech.com / password123")
        print(f"  Doctor 4: doctor4@healthtech.com / password123")
        print(f"  Patient 1: patient1@healthtech.com / password123")
        print(f"  Patient 2: patient2@healthtech.com / password123")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
