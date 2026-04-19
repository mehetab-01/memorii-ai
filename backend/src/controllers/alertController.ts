/**
 * Alert Controller
 * Handles caregiver alerts created by the AI system
 */

import { Request, Response } from 'express';
import supabase from '../config/supabase';
import { CreateAlertInput } from '../types/adk';

/**
 * GET /api/alerts
 * Get all alerts (with optional filters)
 */
export const getAllAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const acknowledged = req.query.acknowledged;
    const priority = req.query.priority as string;

    let query = supabase
      .from('alerts')
      .select('*, patients(name)')
      .order('created_at', { ascending: false });

    // Filter by acknowledged status
    if (acknowledged !== undefined) {
      query = query.eq('acknowledged', acknowledged === 'true');
    }

    // Filter by priority
    if (priority && ['low', 'medium', 'high', 'critical'].includes(priority)) {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
      return;
    }

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch alerts'
    });
  }
};

/**
 * GET /api/alerts/patient/:patientId
 * Get alerts for a specific patient
 */
export const getPatientAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const acknowledged = req.query.acknowledged;

    let query = supabase
      .from('alerts')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    // Filter by acknowledged status
    if (acknowledged !== undefined) {
      query = query.eq('acknowledged', acknowledged === 'true');
    }

    const { data, error } = await query.limit(50);

    if (error) {
      console.error('Error fetching patient alerts:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
      return;
    }

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching patient alerts:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch patient alerts'
    });
  }
};

/**
 * GET /api/alerts/unacknowledged
 * Get all unacknowledged alerts (for caregiver dashboard)
 */
export const getUnacknowledgedAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*, patients(name)')
      .eq('acknowledged', false)
      .order('priority', { ascending: false })  // Critical first
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching unacknowledged alerts:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
      return;
    }

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching unacknowledged alerts:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch unacknowledged alerts'
    });
  }
};

/**
 * POST /api/alerts
 * Create a new alert (called by Python ADK when concerns are detected)
 */
export const createAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const alertData: CreateAlertInput = req.body;

    // Validate required fields
    if (!alertData.patient_id) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'patient_id is required'
      });
      return;
    }

    if (!alertData.alert_type) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'alert_type is required'
      });
      return;
    }

    if (!alertData.message) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'message is required'
      });
      return;
    }

    // Validate priority if provided
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const priority = alertData.priority || 'medium';
    if (!validPriorities.includes(priority)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'priority must be one of: low, medium, high, critical'
      });
      return;
    }

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        patient_id: alertData.patient_id,
        alert_type: alertData.alert_type,
        message: alertData.message,
        priority: priority,
        acknowledged: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
      return;
    }


    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating alert:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create alert'
    });
  }
};

/**
 * PUT /api/alerts/:id/acknowledge
 * Acknowledge an alert
 */
export const acknowledgeAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          error: 'Not Found',
          message: `Alert with ID ${id} not found`
        });
        return;
      }
      console.error('Error acknowledging alert:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
      return;
    }


    res.json(data);
  } catch (err) {
    console.error('Error acknowledging alert:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to acknowledge alert'
    });
  }
};

/**
 * DELETE /api/alerts/:id
 * Delete an alert
 */
export const deleteAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting alert:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
      return;
    }

    res.json({ message: 'Alert deleted successfully' });
  } catch (err) {
    console.error('Error deleting alert:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete alert'
    });
  }
};
