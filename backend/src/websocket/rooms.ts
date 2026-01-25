/**
 * WebSocket Room Management Utilities
 * Helper functions for managing Socket.io rooms
 */

import { Socket } from 'socket.io';

/**
 * Get patient room name
 */
export function getPatientRoom(patientId: string): string {
  return `patient:${patientId}`;
}

/**
 * Get caregiver room name
 */
export function getCaregiverRoom(caregiverId: string): string {
  return `caregiver:${caregiverId}`;
}

/**
 * Get dashboard room name (all caregivers)
 */
export function getDashboardRoom(): string {
  return 'dashboard';
}

/**
 * Join patient-specific room
 */
export function joinPatientRoom(socket: Socket, patientId: string): void {
  const room = getPatientRoom(patientId);
  socket.join(room);
  console.log(`[Socket ${socket.id}] Joined patient room: ${room}`);
}

/**
 * Leave patient-specific room
 */
export function leavePatientRoom(socket: Socket, patientId: string): void {
  const room = getPatientRoom(patientId);
  socket.leave(room);
  console.log(`[Socket ${socket.id}] Left patient room: ${room}`);
}

/**
 * Join caregiver-specific room
 */
export function joinCaregiverRoom(socket: Socket, caregiverId: string): void {
  const room = getCaregiverRoom(caregiverId);
  socket.join(room);
  console.log(`[Socket ${socket.id}] Joined caregiver room: ${room}`);
}

/**
 * Leave caregiver-specific room
 */
export function leaveCaregiverRoom(socket: Socket, caregiverId: string): void {
  const room = getCaregiverRoom(caregiverId);
  socket.leave(room);
  console.log(`[Socket ${socket.id}] Left caregiver room: ${room}`);
}

/**
 * Join dashboard room (all caregivers see updates)
 */
export function joinDashboardRoom(socket: Socket): void {
  const room = getDashboardRoom();
  socket.join(room);
  console.log(`[Socket ${socket.id}] Joined dashboard room: ${room}`);
}

/**
 * Leave dashboard room
 */
export function leaveDashboardRoom(socket: Socket): void {
  const room = getDashboardRoom();
  socket.leave(room);
  console.log(`[Socket ${socket.id}] Left dashboard room: ${room}`);
}

/**
 * Get all rooms a socket is currently in (excluding the default room which is the socket's own ID)
 */
export function getSocketRooms(socket: Socket): string[] {
  return Array.from(socket.rooms).filter(room => room !== socket.id);
}

/**
 * Check if socket is in a specific room
 */
export function isInRoom(socket: Socket, roomName: string): boolean {
  return socket.rooms.has(roomName);
}
