-- Migration 002: add geofence_radius and emergency_contact to patients
-- Run in Supabase dashboard → SQL Editor

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS geofence_radius INTEGER NOT NULL DEFAULT 250;

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(20);
