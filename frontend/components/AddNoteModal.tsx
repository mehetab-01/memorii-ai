'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { patientApi, noteApi, type Patient } from '@/lib/api';

interface AddNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedPatientId?: string;
}

export default function AddNoteModal({
  open,
  onOpenChange,
  onSuccess,
  preselectedPatientId,
}: AddNoteModalProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [patientId, setPatientId] = useState(preselectedPatientId || '');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (open) {
      fetchPatients();
      if (preselectedPatientId) {
        setPatientId(preselectedPatientId);
      }
    }
  }, [open, preselectedPatientId]);

  const fetchPatients = async () => {
    try {
      const data = await patientApi.getAll();
      setPatients(data);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    }
  };

  const resetForm = () => {
    setPatientId(preselectedPatientId || '');
    setContent('');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!patientId || !content.trim()) {
      setError('Please select a patient and enter a note');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await noteApi.create({
        patient_id: patientId,
        content: content.trim(),
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Add Note
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Patient *</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger className="bg-white w-full">
                <SelectValue placeholder="Select a patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Note *</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your observation or note about the patient..."
              className="bg-white min-h-[150px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
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
            disabled={isSubmitting || !content.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Adding...' : 'Add Note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
