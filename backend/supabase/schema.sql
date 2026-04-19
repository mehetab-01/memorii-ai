-- Memoral Database Schema
-- Run this in the Supabase SQL Editor to create all tables

-- ============================================
-- PATIENTS TABLE
-- ============================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL,
  diagnosis VARCHAR(255) NOT NULL,
  photo_url TEXT,
  location VARCHAR(255) DEFAULT 'At home',
  last_checkin TIMESTAMP DEFAULT NOW(),
  safety_status VARCHAR(50) DEFAULT 'safe',
  geofence_radius INTEGER NOT NULL DEFAULT 250,
  emergency_contact VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add check constraint for safety_status
ALTER TABLE patients ADD CONSTRAINT check_safety_status
  CHECK (safety_status IN ('safe', 'warning', 'danger'));

-- ============================================
-- MEDICATIONS TABLE
-- ============================================
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  dosage VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add check constraint for status
ALTER TABLE medications ADD CONSTRAINT check_medication_status
  CHECK (status IN ('scheduled', 'completed', 'upcoming', 'missed'));

-- ============================================
-- REMINDERS TABLE
-- ============================================
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reminder_type VARCHAR(50) NOT NULL,
  due_date TIMESTAMP NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add check constraint for reminder_type
ALTER TABLE reminders ADD CONSTRAINT check_reminder_type
  CHECK (reminder_type IN ('medication', 'appointment', 'task', 'supplies'));

-- ============================================
-- NOTES TABLE
-- ============================================
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DAILY ROUTINES TABLE
-- ============================================
CREATE TABLE daily_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  activity_name VARCHAR(255) NOT NULL,
  time_of_day VARCHAR(50) NOT NULL,
  scheduled_time TIME NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add check constraint for time_of_day
ALTER TABLE daily_routines ADD CONSTRAINT check_time_of_day
  CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night'));

-- ============================================
-- APPOINTMENTS/SCHEDULES TABLE
-- ============================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  appointment_type VARCHAR(50) NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  location VARCHAR(255),
  doctor_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add check constraints for appointments
ALTER TABLE appointments ADD CONSTRAINT check_appointment_type
  CHECK (appointment_type IN ('medical', 'therapy', 'checkup', 'lab', 'other'));

ALTER TABLE appointments ADD CONSTRAINT check_appointment_status
  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled'));

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_medications_patient ON medications(patient_id);
CREATE INDEX idx_reminders_patient ON reminders(patient_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_completed ON reminders(completed);
CREATE INDEX idx_notes_patient ON notes(patient_id);
CREATE INDEX idx_notes_timestamp ON notes(timestamp);
CREATE INDEX idx_patients_safety_status ON patients(safety_status);
CREATE INDEX idx_daily_routines_patient ON daily_routines(patient_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE patients IS 'Dementia care patients being monitored';
COMMENT ON TABLE medications IS 'Medications prescribed to patients';
COMMENT ON TABLE reminders IS 'Tasks, appointments, and reminders for caregivers';
COMMENT ON TABLE notes IS 'Caregiver notes and observations about patients';
COMMENT ON TABLE daily_routines IS 'Daily routine activities for patients';
COMMENT ON TABLE appointments IS 'Scheduled appointments for patients';
