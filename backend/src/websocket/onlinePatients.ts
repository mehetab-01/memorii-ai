/**
 * Shared in-memory store tracking currently connected patient devices.
 * Updated by SocketServer; read by REST endpoints.
 */

export interface OnlinePatientEntry {
  socketId: string;
  connectedAt: string;
  lastHeartbeat?: string;
  deviceId?: string;
}

export const onlinePatients = new Map<string, OnlinePatientEntry>();
