-- Migration: add geofence_radius column to patients table
-- Run this once in your Supabase dashboard:
--   Project → SQL Editor → New query → paste → Run

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS geofence_radius INTEGER NOT NULL DEFAULT 250;
