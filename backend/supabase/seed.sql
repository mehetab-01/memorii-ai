-- Memoral Database - Clean Setup
-- Run this in Supabase SQL Editor to clear all data
-- All patient data will be added through the frontend application

-- ============================================
-- CLEAR ALL EXISTING DATA
-- ============================================
TRUNCATE TABLE appointments CASCADE;
TRUNCATE TABLE daily_routines CASCADE;
TRUNCATE TABLE notes CASCADE;
TRUNCATE TABLE reminders CASCADE;
TRUNCATE TABLE medications CASCADE;
TRUNCATE TABLE patients CASCADE;

-- Database is now clean and ready for use
-- Add patients through the application's "Add Patient" button
