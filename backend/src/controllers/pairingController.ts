/**
 * Pairing Controller
 * Generates short-lived pairing tokens so the frontend can display a QR code
 * that the patient app scans during initial setup.
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import supabase from '../config/supabase';

interface PairingEntry {
  patientId: string;
  expiresAt: number;
}

// In-memory token store (short-lived, no persistence needed)
const pairingTokens = new Map<string, PairingEntry>();
const EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of pairingTokens.entries()) {
    if (now > entry.expiresAt) pairingTokens.delete(key);
  }
}, 60_000);

/**
 * GET /api/patients/:patientId/pairing-code
 * Generate a pairing token + 6-digit short code for the patient.
 */
export const generatePairingToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, name')
      .eq('id', patientId)
      .single();

    if (error || !patient) {
      res.status(404).json({ error: 'Not Found', message: 'Patient not found' });
      return;
    }

    const token = crypto.randomBytes(16).toString('hex');
    const shortCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + EXPIRY_MS;

    pairingTokens.set(token, { patientId, expiresAt });
    pairingTokens.set(shortCode, { patientId, expiresAt });

    // QR payload — SetupScreen's parseQRData will JSON.parse this
    const qrPayload = JSON.stringify({
      type: 'memorii_pair',
      patientId: patient.id,
      patientName: patient.name,
      token,
      shortCode,
    });

    res.json({
      token,
      shortCode,
      qrPayload,
      patientId: patient.id,
      patientName: patient.name,
      expiresAt: new Date(expiresAt).toISOString(),
      expiresInMinutes: 10,
    });
  } catch (err) {
    console.error('[Pairing] Error generating token:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to generate pairing code' });
  }
};

/**
 * POST /api/patients/verify-pairing
 * Verify a token or short code and return the patient profile on success.
 * Consumes the token (one-time use).
 */
export const verifyPairingToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Bad Request', message: 'token is required' });
      return;
    }

    const entry = pairingTokens.get(String(token).trim());
    if (!entry) {
      res.status(404).json({ error: 'Not Found', message: 'Invalid or expired code' });
      return;
    }
    if (Date.now() > entry.expiresAt) {
      pairingTokens.delete(String(token).trim());
      res.status(410).json({ error: 'Gone', message: 'Code expired. Ask your caretaker for a new one.' });
      return;
    }

    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, name, age, diagnosis, photo_url, geofence_radius, emergency_contact')
      .eq('id', entry.patientId)
      .single();

    if (error || !patient) {
      res.status(404).json({ error: 'Not Found', message: 'Patient not found' });
      return;
    }

    // Consume token (remove both short code and full token versions)
    pairingTokens.delete(String(token).trim());

    res.json({ success: true, patient });
  } catch (err) {
    console.error('[Pairing] Error verifying token:', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to verify pairing code' });
  }
};
