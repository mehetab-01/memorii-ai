'use client';

import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, RefreshCw, Smartphone } from 'lucide-react';
import type { Patient } from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface PairingData {
  qrPayload: string;
  shortCode: string;
  expiresAt: string;
  expiresInMinutes: number;
}

interface PairingModalProps {
  patient: Patient;
  onClose: () => void;
}

export default function PairingModal({ patient, onClose }: PairingModalProps) {
  const [pairingData, setPairingData] = useState<PairingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 min in seconds

  const fetchCode = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${patient.id}/pairing-code`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate code');
      setPairingData(data);
      setTimeLeft(data.expiresInMinutes * 60);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  }, [patient.id]);

  useEffect(() => {
    fetchCode();
  }, [fetchCode]);

  // Countdown timer
  useEffect(() => {
    if (!pairingData) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          setPairingData(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pairingData]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Smartphone size={20} className="text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Connect Device</h2>
              <p className="text-sm text-gray-500">For {patient.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            <p className="text-sm text-gray-500">Generating pairing code...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-6">
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={fetchCode}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm mx-auto"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
          </div>
        )}

        {/* QR + Code */}
        {pairingData && !loading && (
          <>
            {/* QR Code */}
            <div className="flex justify-center mb-5">
              <div className="p-4 border-2 border-gray-100 rounded-xl bg-white">
                <QRCodeSVG
                  value={pairingData.qrPayload}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Manual short code */}
            <div className="text-center mb-4">
              <p className="text-xs text-gray-500 mb-1">Or enter this code manually in the app</p>
              <p className="text-3xl font-mono font-bold tracking-[0.3em] text-blue-600">
                {pairingData.shortCode}
              </p>
            </div>

            {/* Expiry countdown */}
            <div className={`text-center text-sm mb-4 ${timeLeft < 60 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {timeLeft > 0
                ? `Expires in ${minutes}:${seconds.toString().padStart(2, '0')}`
                : 'Code expired'}
            </div>

            {timeLeft === 0 && (
              <button
                onClick={fetchCode}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm"
              >
                <RefreshCw size={14} />
                Generate New Code
              </button>
            )}

            <p className="text-xs text-gray-400 text-center mt-4">
              Show this QR code to {patient.name} or give them the 6-digit code to enter in the Memorii app.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
