'use client';

import { useState } from 'react';
import { X, Plus, Trash2, User, Pill, Calendar, Clock } from 'lucide-react';
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
  medicationApi,
  dailyRoutineApi,
  appointmentApi,
  reminderApi,
  type CreatePatientInput,
  type CreateMedicationInput,
  type CreateDailyRoutineInput,
  type CreateAppointmentInput,
  type CreateReminderInput,
} from '@/lib/api';

interface MedicationEntry {
  id: string;
  name: string;
  dosage: string;
  status: 'scheduled' | 'completed' | 'upcoming' | 'missed';
}

interface RoutineEntry {
  id: string;
  activity_name: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  scheduled_time: string;
  description: string;
}

interface AppointmentEntry {
  id: string;
  title: string;
  description: string;
  appointment_type: 'medical' | 'therapy' | 'checkup' | 'lab' | 'other';
  appointment_date: string;
  appointment_time: string;
  location: string;
  doctor_name: string;
}

interface AddPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AddPatientModal({
  open,
  onOpenChange,
  onSuccess,
}: AddPatientModalProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic Info
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [location, setLocation] = useState('At home');
  const [safetyStatus, setSafetyStatus] = useState<'safe' | 'warning' | 'danger'>('safe');

  // Medications
  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');

  // Daily Routines
  const [routines, setRoutines] = useState<RoutineEntry[]>([]);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineTime, setNewRoutineTime] = useState('');
  const [newRoutineTimeOfDay, setNewRoutineTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('morning');
  const [newRoutineDesc, setNewRoutineDesc] = useState('');

  // Appointments
  const [appointments, setAppointments] = useState<AppointmentEntry[]>([]);
  const [newApptTitle, setNewApptTitle] = useState('');
  const [newApptType, setNewApptType] = useState<'medical' | 'therapy' | 'checkup' | 'lab' | 'other'>('medical');
  const [newApptDate, setNewApptDate] = useState('');
  const [newApptTime, setNewApptTime] = useState('');
  const [newApptLocation, setNewApptLocation] = useState('');
  const [newApptDoctor, setNewApptDoctor] = useState('');
  const [newApptDesc, setNewApptDesc] = useState('');

  const resetForm = () => {
    setName('');
    setAge('');
    setDiagnosis('');
    setLocation('At home');
    setSafetyStatus('safe');
    setMedications([]);
    setRoutines([]);
    setAppointments([]);
    setActiveTab('basic');
    setError(null);
  };

  const addMedication = () => {
    if (newMedName && newMedDosage) {
      setMedications([
        ...medications,
        {
          id: crypto.randomUUID(),
          name: newMedName,
          dosage: newMedDosage,
          status: 'scheduled',
        },
      ]);
      setNewMedName('');
      setNewMedDosage('');
    }
  };

  const removeMedication = (id: string) => {
    setMedications(medications.filter((m) => m.id !== id));
  };

  const addRoutine = () => {
    if (newRoutineName && newRoutineTime) {
      setRoutines([
        ...routines,
        {
          id: crypto.randomUUID(),
          activity_name: newRoutineName,
          time_of_day: newRoutineTimeOfDay,
          scheduled_time: newRoutineTime,
          description: newRoutineDesc,
        },
      ]);
      setNewRoutineName('');
      setNewRoutineTime('');
      setNewRoutineDesc('');
    }
  };

  const removeRoutine = (id: string) => {
    setRoutines(routines.filter((r) => r.id !== id));
  };

  const addAppointment = () => {
    if (newApptTitle && newApptDate && newApptTime) {
      setAppointments([
        ...appointments,
        {
          id: crypto.randomUUID(),
          title: newApptTitle,
          description: newApptDesc,
          appointment_type: newApptType,
          appointment_date: newApptDate,
          appointment_time: newApptTime,
          location: newApptLocation,
          doctor_name: newApptDoctor,
        },
      ]);
      setNewApptTitle('');
      setNewApptDesc('');
      setNewApptDate('');
      setNewApptTime('');
      setNewApptLocation('');
      setNewApptDoctor('');
    }
  };

  const removeAppointment = (id: string) => {
    setAppointments(appointments.filter((a) => a.id !== id));
  };

  const handleSubmit = async () => {
    if (!name || !age || !diagnosis) {
      setError('Please fill in all required fields (Name, Age, Diagnosis)');
      setActiveTab('basic');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Create patient
      const patientData: CreatePatientInput = {
        name,
        age: parseInt(age),
        diagnosis,
        location,
        safety_status: safetyStatus,
      };

      const patient = await patientApi.create(patientData);

      // Create medications and corresponding reminders
      for (const med of medications) {
        const medData: CreateMedicationInput = {
          patient_id: patient.id,
          name: med.name,
          dosage: med.dosage,
          status: med.status,
        };
        await medicationApi.create(medData);

        // Create a reminder for this medication
        // Parse time from dosage if possible (e.g., "1/day at 10:00am")
        const timeMatch = med.dosage.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        let dueTime = '08:00'; // Default to 8 AM
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] ? timeMatch[2] : '00';
          const period = timeMatch[3]?.toLowerCase();
          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          dueTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
        }
        
        const today = new Date();
        const dueDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T${dueTime}:00`;
        
        const reminderData: CreateReminderInput = {
          patient_id: patient.id,
          title: `${med.name} - ${med.dosage}`,
          description: `Medication reminder for ${name}`,
          reminder_type: 'medication',
          due_date: dueDate,
        };
        await reminderApi.create(reminderData);
      }

      // Create daily routines and corresponding tasks
      for (const routine of routines) {
        const routineData: CreateDailyRoutineInput = {
          patient_id: patient.id,
          activity_name: routine.activity_name,
          time_of_day: routine.time_of_day,
          scheduled_time: routine.scheduled_time,
          description: routine.description,
        };
        await dailyRoutineApi.create(routineData);

        // Create a task for this routine
        const today = new Date();
        const dueDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T${routine.scheduled_time}:00`;
        
        const taskData: CreateReminderInput = {
          patient_id: patient.id,
          title: routine.activity_name,
          description: routine.description || `Daily routine for ${name}`,
          reminder_type: 'task',
          due_date: dueDate,
        };
        await reminderApi.create(taskData);
      }

      // Create appointments and corresponding reminders
      for (const appt of appointments) {
        const apptData: CreateAppointmentInput = {
          patient_id: patient.id,
          title: appt.title,
          description: appt.description,
          appointment_type: appt.appointment_type,
          appointment_date: appt.appointment_date,
          appointment_time: appt.appointment_time,
          location: appt.location,
          doctor_name: appt.doctor_name,
        };
        await appointmentApi.create(apptData);

        // Create a reminder for this appointment
        const appointmentReminderData: CreateReminderInput = {
          patient_id: patient.id,
          title: `${appt.title}${appt.doctor_name ? ` with ${appt.doctor_name}` : ''}`,
          description: appt.location ? `Location: ${appt.location}` : appt.description,
          reminder_type: 'appointment',
          due_date: `${appt.appointment_date}T${appt.appointment_time}:00`,
        };
        await reminderApi.create(appointmentReminderData);
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Add New Patient
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <User size={16} />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="medications" className="flex items-center gap-2">
              <Pill size={16} />
              Medications
            </TabsTrigger>
            <TabsTrigger value="routines" className="flex items-center gap-2">
              <Clock size={16} />
              Routines
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar size={16} />
              Schedules
            </TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter patient name"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter age"
                  className="bg-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnosis *</Label>
              <Input
                id="diagnosis"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g., Alzheimer's, Dementia"
                className="bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Current Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., At home"
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="safety">Safety Status</Label>
                <Select value={safetyStatus} onValueChange={(v) => setSafetyStatus(v as typeof safetyStatus)}>
                  <SelectTrigger className="bg-white w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safe">Safe</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="danger">Danger</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* Medications Tab */}
          <TabsContent value="medications" className="space-y-4 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-900">Add Medication</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Medication Name</Label>
                  <Input
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    placeholder="e.g., Donepezil"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dosage</Label>
                  <Input
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    placeholder="e.g., 1/day at 8:00am"
                    className="bg-white"
                  />
                </div>
              </div>
              <Button onClick={addMedication} className="w-full" variant="outline">
                <Plus size={16} />
                Add Medication
              </Button>
            </div>

            {medications.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Added Medications</h3>
                {medications.map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between bg-white border rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{med.name}</p>
                      <p className="text-sm text-gray-500">{med.dosage}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeMedication(med.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Daily Routines Tab */}
          <TabsContent value="routines" className="space-y-4 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-900">Add Daily Routine</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Activity Name</Label>
                  <Input
                    value={newRoutineName}
                    onChange={(e) => setNewRoutineName(e.target.value)}
                    placeholder="e.g., Morning Exercise"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time of Day</Label>
                  <Select value={newRoutineTimeOfDay} onValueChange={(v) => setNewRoutineTimeOfDay(v as typeof newRoutineTimeOfDay)}>
                    <SelectTrigger className="bg-white w-full">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scheduled Time</Label>
                  <Input
                    type="time"
                    value={newRoutineTime}
                    onChange={(e) => setNewRoutineTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input
                    value={newRoutineDesc}
                    onChange={(e) => setNewRoutineDesc(e.target.value)}
                    placeholder="Additional details"
                    className="bg-white"
                  />
                </div>
              </div>
              <Button onClick={addRoutine} className="w-full" variant="outline">
                <Plus size={16} />
                Add Routine
              </Button>
            </div>

            {routines.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Added Routines</h3>
                {routines.map((routine) => (
                  <div
                    key={routine.id}
                    className="flex items-center justify-between bg-white border rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{routine.activity_name}</p>
                      <p className="text-sm text-gray-500">
                        {routine.time_of_day.charAt(0).toUpperCase() + routine.time_of_day.slice(1)} at {routine.scheduled_time}
                      </p>
                      {routine.description && (
                        <p className="text-xs text-gray-400">{routine.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeRoutine(routine.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-4 mt-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-gray-900">Schedule Appointment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Appointment Title</Label>
                  <Input
                    value={newApptTitle}
                    onChange={(e) => setNewApptTitle(e.target.value)}
                    placeholder="e.g., Doctor Visit"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newApptType} onValueChange={(v) => setNewApptType(v as typeof newApptType)}>
                    <SelectTrigger className="bg-white w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="therapy">Therapy</SelectItem>
                      <SelectItem value="checkup">Checkup</SelectItem>
                      <SelectItem value="lab">Lab Work</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newApptDate}
                    onChange={(e) => setNewApptDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newApptTime}
                    onChange={(e) => setNewApptTime(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Doctor Name (Optional)</Label>
                  <Input
                    value={newApptDoctor}
                    onChange={(e) => setNewApptDoctor(e.target.value)}
                    placeholder="e.g., Dr. Smith"
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location (Optional)</Label>
                  <Input
                    value={newApptLocation}
                    onChange={(e) => setNewApptLocation(e.target.value)}
                    placeholder="e.g., City Hospital"
                    className="bg-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={newApptDesc}
                  onChange={(e) => setNewApptDesc(e.target.value)}
                  placeholder="Additional notes about the appointment"
                  className="bg-white"
                />
              </div>
              <Button onClick={addAppointment} className="w-full" variant="outline">
                <Plus size={16} />
                Add Appointment
              </Button>
            </div>

            {appointments.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">Scheduled Appointments</h3>
                {appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-center justify-between bg-white border rounded-lg p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{appt.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(appt.appointment_date).toLocaleDateString()} at {appt.appointment_time}
                      </p>
                      {appt.doctor_name && (
                        <p className="text-xs text-gray-400">with {appt.doctor_name}</p>
                      )}
                      {appt.location && (
                        <p className="text-xs text-gray-400">at {appt.location}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeAppointment(appt.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSubmitting ? 'Creating...' : 'Create Patient'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
