export interface User {
  id: number;
  email: string;
  role: 'doctor' | 'patient' | 'admin';
  full_name: string;
}

export interface Specialization {
  id: number;
  name: string;
  description?: string;
}

export interface DoctorProfile {
  id: number;
  user_id: number;
  full_name: string;
  phone?: string;
  license_number: string;
  experience_years: number;
  bio?: string;
  department?: string;
  consultation_fee_cents: number;
  currency: string;
  is_verified: boolean;
  specializations: Specialization[];
}

export interface PatientProfile {
  id: number;
  user_id: number;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  medical_history?: string;
  allergies?: string;
}

export interface AppointmentNote {
  id: number;
  appointment_id: number;
  created_by: number;
  notes?: string;
  prescription?: string;
  created_at: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  type: 'in_person' | 'teleconsultation';
  reason?: string;
  cancellation_reason?: string;
  fee_cents: number;
  created_at: string;
  notes: AppointmentNote[];
}

export interface ScheduleBlock {
  id: number;
  doctor_id: number;
  block_start: string;
  block_end: string;
  reason?: string;
  created_at: string;
}

