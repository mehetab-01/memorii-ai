-- Migration: Add conversations and alerts tables for AI integration
-- Run this in your Supabase SQL Editor

-- ============================================
-- CONVERSATIONS TABLE
-- Stores AI conversation history for analysis
-- ============================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  agent VARCHAR(50) NOT NULL,
  sentiment VARCHAR(50),
  confidence DECIMAL(3,2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_agent CHECK (agent IN ('memory', 'task', 'health', 'supervisor')),
  CONSTRAINT valid_sentiment CHECK (sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative')),
  CONSTRAINT valid_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_conversations_patient ON conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_patient_timestamp ON conversations(patient_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_sentiment ON conversations(sentiment);

-- Enable Row Level Security (optional - uncomment if using RLS)
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;


-- ============================================
-- ALERTS TABLE
-- Stores caregiver alerts created by AI agents
-- ============================================

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'critical'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_alerts_patient ON alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_patient_unacknowledged ON alerts(patient_id) WHERE acknowledged = FALSE;

-- Enable Row Level Security (optional - uncomment if using RLS)
-- ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;


-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE conversations IS 'Stores AI conversation history between patients and the multi-agent system';
COMMENT ON COLUMN conversations.patient_id IS 'Reference to the patient involved in the conversation';
COMMENT ON COLUMN conversations.message IS 'The patient/user message';
COMMENT ON COLUMN conversations.response IS 'The AI agent response';
COMMENT ON COLUMN conversations.agent IS 'Which AI agent handled the request (memory, task, health, supervisor)';
COMMENT ON COLUMN conversations.sentiment IS 'Detected sentiment of the user message';
COMMENT ON COLUMN conversations.confidence IS 'AI confidence score for the response (0-1)';

COMMENT ON TABLE alerts IS 'Stores alerts created by AI agents for caregiver attention';
COMMENT ON COLUMN alerts.patient_id IS 'Reference to the patient the alert is about';
COMMENT ON COLUMN alerts.alert_type IS 'Type of alert (confusion, emergency, medication, health, etc.)';
COMMENT ON COLUMN alerts.message IS 'Alert message/description';
COMMENT ON COLUMN alerts.priority IS 'Alert priority level (low, medium, high, critical)';
COMMENT ON COLUMN alerts.acknowledged IS 'Whether the alert has been acknowledged by a caregiver';
COMMENT ON COLUMN alerts.acknowledged_at IS 'Timestamp when the alert was acknowledged';


-- ============================================
-- SAMPLE DATA (for testing - optional)
-- Uncomment to add sample data
-- ============================================

/*
-- Sample conversation
INSERT INTO conversations (patient_id, message, response, agent, sentiment, confidence)
SELECT
  id as patient_id,
  'Did I take my morning medication?' as message,
  'Let me check your schedule. According to your records, you took your morning medication (Donepezil 10mg) at 8:15 AM today. You''re all set!' as response,
  'task' as agent,
  'neutral' as sentiment,
  0.92 as confidence
FROM patients
LIMIT 1;

-- Sample alert
INSERT INTO alerts (patient_id, alert_type, message, priority)
SELECT
  id as patient_id,
  'confusion' as alert_type,
  'Patient showed signs of confusion during morning conversation. Repeated same question 3 times within 10 minutes.' as message,
  'medium' as priority
FROM patients
LIMIT 1;
*/


-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify tables were created
-- ============================================

-- Check conversations table exists
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'conversations'
ORDER BY ordinal_position;

-- Check alerts table exists
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'alerts'
ORDER BY ordinal_position;

-- Check indexes were created
SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE tablename IN ('conversations', 'alerts');
