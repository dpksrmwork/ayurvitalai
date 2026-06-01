-- sample_load.sql
-- This script contains sample data for doctors, patients, departments (specializations), and appointments.
-- It can be loaded into your PostgreSQL database using `psql` or `pg_restore`.

-- To execute:
-- docker exec -i ayurvitalai-postgres-1 psql -U ayurvital -d ayurvital < sample_load.sql

BEGIN;

-- 1. Insert Specializations (Departments)
-- We insert without IDs to let the SERIAL auto-increment
INSERT INTO specializations (name, description) VALUES
('Cardiology', 'Heart and cardiovascular system'),
('Orthopedics', 'Bones and muscles'),
('Pediatrics', 'Children and infants'),
('Dermatology', 'Skin conditions');

-- 2. Insert Users
-- Note: The password hash below corresponds to the password: 'password123'
INSERT INTO users (email, password_hash, role, is_active, created_at) VALUES
('admin@ayurvital.com', '$2b$12$XKj17Wk3UZEzWgizeH7ufemytsbvlZkJOHZXwQ8yEjNu.7wxjKoCm', 'admin', true, NOW()),
('dr.smith@ayurvital.com', '$2b$12$XKj17Wk3UZEzWgizeH7ufemytsbvlZkJOHZXwQ8yEjNu.7wxjKoCm', 'doctor', true, NOW()),
('dr.jones@ayurvital.com', '$2b$12$XKj17Wk3UZEzWgizeH7ufemytsbvlZkJOHZXwQ8yEjNu.7wxjKoCm', 'doctor', true, NOW()),
('jane.doe@example.com', '$2b$12$XKj17Wk3UZEzWgizeH7ufemytsbvlZkJOHZXwQ8yEjNu.7wxjKoCm', 'patient', true, NOW());

-- 3. Insert Doctor Profiles
-- Using subqueries to get the correct user IDs dynamically
INSERT INTO doctor_profiles (user_id, full_name, phone, license_number, experience_years, bio, department, consultation_fee_cents, currency, is_verified) VALUES
(
    (SELECT id FROM users WHERE email = 'dr.smith@ayurvital.com'), 
    'Dr. Alice Smith', '+1234567890', 'LIC-1001', 10, 'Expert cardiologist with 10 years experience.', 'Cardiology', 15000, 'usd', true
),
(
    (SELECT id FROM users WHERE email = 'dr.jones@ayurvital.com'), 
    'Dr. Bob Jones', '+1987654321', 'LIC-1002', 5, 'Dedicated pediatrician.', 'Pediatrics', 10000, 'usd', true
);

-- 4. Link Doctors to Specializations
INSERT INTO doctor_specializations (doctor_id, specialization_id) VALUES
(
    (SELECT id FROM doctor_profiles WHERE license_number = 'LIC-1001'),
    (SELECT id FROM specializations WHERE name = 'Cardiology')
),
(
    (SELECT id FROM doctor_profiles WHERE license_number = 'LIC-1002'),
    (SELECT id FROM specializations WHERE name = 'Pediatrics')
);

-- 5. Insert Patient Profiles
INSERT INTO patient_profiles (user_id, full_name, phone, date_of_birth, gender, blood_group, medical_history, allergies) VALUES
(
    (SELECT id FROM users WHERE email = 'jane.doe@example.com'),
    'Jane Doe', '+1122334455', '1990-05-15', 'Female', 'O+', 'No major prior conditions', 'Penicillin'
);

-- 6. Insert Appointments
INSERT INTO appointments (patient_id, doctor_id, appointment_date, start_time, end_time, status, type, reason, fee_cents, created_at) VALUES
(
    (SELECT id FROM patient_profiles WHERE full_name = 'Jane Doe'),
    (SELECT id FROM doctor_profiles WHERE license_number = 'LIC-1001'),
    '2026-06-15 10:00:00', '10:00', '10:30', 'confirmed', 'in_person', 'Routine heart checkup', 15000, NOW()
);

COMMIT;
