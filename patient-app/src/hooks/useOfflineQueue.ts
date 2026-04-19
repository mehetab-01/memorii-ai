/**
 * useOfflineQueue
 * Flushes queued offline actions when network connectivity is restored.
 */
import { useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import {
  getOfflineQueue,
  clearOfflineQueue,
  OfflineAction,
} from '../storage';
import { api } from '../services/api';

async function flushAction(action: OfflineAction): Promise<void> {
  switch (action.type) {
    case 'complete_reminder': {
      const { patientId, itemId } = action.payload as { patientId: string; itemId: string };
      await api.completeScheduleItem(patientId, itemId);
      break;
    }
    case 'update_stat': {
      const { patientId, stats } = action.payload as { patientId: string; stats: Record<string, number> };
      await api.updateDailyStats(patientId, stats);
      break;
    }
    case 'sos_fired': {
      // Best-effort — no retry needed, alert was already handled locally
      break;
    }
  }
}

export function useOfflineQueue() {
  const isFlushing = useRef(false);

  const flush = useCallback(async () => {
    if (isFlushing.current) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    isFlushing.current = true;
    try {
      for (const action of queue) {
        try {
          await flushAction(action);
        } catch {
          // If one fails, stop — don't lose the queue
          return;
        }
      }
      clearOfflineQueue();
    } finally {
      isFlushing.current = false;
    }
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        flush();
      }
    });
    return unsub;
  }, [flush]);

  return { flush };
}
