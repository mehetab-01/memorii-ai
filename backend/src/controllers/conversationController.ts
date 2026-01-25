/**
 * Conversation Controller
 * Handles conversation logging and retrieval for AI interactions
 */

import { Request, Response } from 'express';
import supabase from '../config/supabase';
import { CreateConversationInput } from '../types/adk';

/**
 * GET /api/conversations/patient/:patientId
 * Get conversations for a specific patient
 */
export const getPatientConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
      return;
    }

    res.json(data || []);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch conversations'
    });
  }
};

/**
 * POST /api/conversations
 * Log a new conversation (called by Python ADK)
 */
export const createConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const conversationData: CreateConversationInput = req.body;

    // Validate required fields
    if (!conversationData.patient_id) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'patient_id is required'
      });
      return;
    }

    if (!conversationData.message) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'message is required'
      });
      return;
    }

    if (!conversationData.response) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'response is required'
      });
      return;
    }

    if (!conversationData.agent) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'agent is required'
      });
      return;
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        patient_id: conversationData.patient_id,
        message: conversationData.message,
        response: conversationData.response,
        agent: conversationData.agent,
        sentiment: conversationData.sentiment || null,
        confidence: conversationData.confidence || null,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
      return;
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('Error creating conversation:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create conversation'
    });
  }
};

/**
 * GET /api/conversations/patient/:patientId/stats
 * Get conversation statistics for a patient
 */
export const getConversationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get conversations in the time period
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('sentiment, agent, timestamp')
      .eq('patient_id', patientId)
      .gte('timestamp', startDate.toISOString());

    if (error) {
      console.error('Error fetching conversation stats:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
      return;
    }

    // Calculate statistics
    const stats = {
      totalConversations: conversations?.length || 0,
      sentimentBreakdown: {
        positive: 0,
        neutral: 0,
        negative: 0
      },
      agentBreakdown: {
        memory: 0,
        task: 0,
        health: 0
      },
      averagePerDay: 0
    };

    if (conversations) {
      conversations.forEach(conv => {
        // Sentiment breakdown
        if (conv.sentiment === 'positive') stats.sentimentBreakdown.positive++;
        else if (conv.sentiment === 'negative') stats.sentimentBreakdown.negative++;
        else stats.sentimentBreakdown.neutral++;

        // Agent breakdown
        if (conv.agent === 'memory') stats.agentBreakdown.memory++;
        else if (conv.agent === 'task') stats.agentBreakdown.task++;
        else if (conv.agent === 'health') stats.agentBreakdown.health++;
      });

      stats.averagePerDay = Math.round((stats.totalConversations / days) * 10) / 10;
    }

    res.json(stats);
  } catch (err) {
    console.error('Error fetching conversation stats:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch conversation statistics'
    });
  }
};
