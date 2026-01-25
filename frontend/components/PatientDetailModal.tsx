'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Pill,
  Calendar,
  Clock,
  MapPin,
  Shield,
  FileText,
  Plus,
  Trash2,
  Edit2,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  patientApi,
  noteApi,
  dailyRoutineApi,
  appointmentApi,
  type Patient,
  type Note,
  type DailyRoutine,
  type Appointment,
} from '@/lib/api';

interface PatientDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  onUpdate?: () => void;
}

export default function PatientDetailModal({
  open,
  onOpenChange,
  patient,
  onUpdate,
}: PatientDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState<Note[]>([]);
  const [routines, setRoutines] = useState<DailyRoutine[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(patient.name);
  const [editAge, setEditAge] = useState(patient.age.toString());
  const [editDiagnosis, setEditDiagnosis] = useState(patient.diagnosis);
  const [editLocation, setEditLocation] = useState(patient.location);
  const [editSafetyStatus, setEditSafetyStatus] = useState(patient.safety_status);

  // New note state
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    if (open && patient) {
      fetchPatientData();
    }
  }, [open, patient]);

  const fetchPatientData = async () => {
    setIsLoading(true);
    try {
      const [notesData, routinesData, appointmentsData] = await Promise.all([
        noteApi.getByPatient(patient.id),
        dailyRoutineApi.getByPatient(patient.id),
        appointmentApi.getByPatient(patient.id),
      ]);
      setNotes(notesData);
      setRoutines(routinesData);
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePatient = async () => {
    try {
      await patientApi.update(patient.id, {
        name: editName,
        age: parseInt(editAge),
        diagnosis: editDiagnosis,
        location: editLocation,
        safety_status: editSafetyStatus,
      });
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update patient:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsAddingNote(true);
    try {
      await noteApi.create({
        patient_id: patient.id,
        content: newNote,
      });
      setNewNote('');
      fetchPatientData();
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsAddingNote(false);
    }
  };

  const getSafetyBadge = (status: string) => {
    const styles = {
      safe: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      danger: 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[status as keyof typeof styles] || styles.safe;
  };

  const formatTime = (time: string) => {
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return time;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Patient Details
            </DialogTitle>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="mr-8"
              >
                <Edit2 size={16} />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <User size={16} />
              Overview
            </TabsTrigger>
            <TabsTrigger value="routines" className="flex items-center gap-2">
              <Clock size={16} />
              Routines
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar size={16} />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center gap-2">
              <FileText size={16} />
              Notes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input
                      type="number"
                      value={editAge}
                      onChange={(e) => setEditAge(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Diagnosis</Label>
                  <Input
                    value={editDiagnosis}
                    onChange={(e) => setEditDiagnosis(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Safety Status</Label>
                    <Select
                      value={editSafetyStatus}
                      onValueChange={(v) => setEditSafetyStatus(v as typeof editSafetyStatus)}
                    >
                      <SelectTrigger className="bg-white w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="safe">Safe</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="danger">Danger</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdatePatient} className="bg-purple-600 hover:bg-purple-700">
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Patient Header */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                    <User size={32} className="text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-semibold text-gray-900">{patient.name}</h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full border ${getSafetyBadge(
                          patient.safety_status
                        )}`}
                      >
                        {patient.safety_status}
                      </span>
                    </div>
                    <p className="text-gray-600">{patient.age} years old</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Shield size={14} />
                        {patient.diagnosis}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {patient.location}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Medications */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Pill size={18} />
                    Medications
                  </h4>
                  {patient.medications && patient.medications.length > 0 ? (
                    <div className="grid gap-2">
                      {patient.medications.map((med) => (
                        <div
                          key={med.id}
                          className="flex items-center justify-between p-3 bg-white border rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{med.name}</p>
                            <p className="text-sm text-gray-500">{med.dosage}</p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              med.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : med.status === 'missed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {med.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No medications recorded</p>
                  )}
                </div>

                {/* Last Check-in */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Last Check-in</p>
                  <p className="text-blue-900">
                    {new Date(patient.last_checkin).toLocaleString()}
                  </p>
                </div>
              </>
            )}
          </TabsContent>

          {/* Routines Tab */}
          <TabsContent value="routines" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Daily Routines</h4>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : routines.length > 0 ? (
              <div className="space-y-4">
                {['morning', 'afternoon', 'evening', 'night'].map((timeOfDay) => {
                  const timeRoutines = routines.filter((r) => r.time_of_day === timeOfDay);
                  if (timeRoutines.length === 0) return null;

                  return (
                    <div key={timeOfDay}>
                      <h5 className="text-sm font-medium text-gray-500 uppercase mb-2">
                        {timeOfDay}
                      </h5>
                      <div className="space-y-2">
                        {timeRoutines.map((routine) => (
                          <div
                            key={routine.id}
                            className="flex items-center justify-between p-3 bg-white border rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{routine.activity_name}</p>
                              <p className="text-sm text-gray-500">
                                {formatTime(routine.scheduled_time)}
                              </p>
                              {routine.description && (
                                <p className="text-xs text-gray-400 mt-1">{routine.description}</p>
                              )}
                            </div>
                            <Clock size={16} className="text-gray-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock size={40} className="mx-auto mb-2 text-gray-300" />
                <p>No daily routines set up yet</p>
              </div>
            )}
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Scheduled Appointments</h4>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 bg-white border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900">{appt.title}</h5>
                        <p className="text-sm text-gray-600">
                          {formatDate(appt.appointment_date)} at {formatTime(appt.appointment_time)}
                        </p>
                        {appt.doctor_name && (
                          <p className="text-sm text-gray-500">with {appt.doctor_name}</p>
                        )}
                        {appt.location && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin size={12} />
                            {appt.location}
                          </p>
                        )}
                        {appt.description && (
                          <p className="text-xs text-gray-400 mt-2">{appt.description}</p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          appt.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : appt.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {appt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar size={40} className="mx-auto mb-2 text-gray-300" />
                <p>No appointments scheduled</p>
              </div>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            {/* Add Note */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <Label className="mb-2">Add a Note</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a note about this patient..."
                className="bg-white mb-2"
              />
              <Button
                onClick={handleAddNote}
                disabled={!newNote.trim() || isAddingNote}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isAddingNote ? 'Adding...' : 'Add Note'}
              </Button>
            </div>

            {/* Notes List */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Recent Notes</h4>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                </div>
              ) : notes.length > 0 ? (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 bg-white border rounded-lg"
                  >
                    <p className="text-gray-900">{note.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(note.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText size={40} className="mx-auto mb-2 text-gray-300" />
                  <p>No notes yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
