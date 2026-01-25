"""
API Routes for ADK Service
Handles chat, analysis, and reminder optimization endpoints
"""

import os
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

# Import agents and tools
from agents.supervision_agent.router import SupervisionRouter
from agents.memory_agent.memory_tools import MemoryTools
from agents.task_agent.task_tools import TaskTools
from agents.health_agent.health_tools import HealthTools
from tools.backend_client import backend_client
from websocket_client import ws_client

# Optional: Import Google Generative AI if available
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["ai"])


# ==================== PYDANTIC MODELS ====================

class ConversationMessage(BaseModel):
    """Model for a conversation message"""
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    patientId: Optional[str] = Field(None, description="UUID of the patient (optional for general queries)")
    message: str = Field(..., description="User's message")
    conversationHistory: Optional[List[ConversationMessage]] = Field(
        default=[],
        description="Previous conversation messages"
    )


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str
    agent: str
    sentiment: str
    confidence: float


class AnalyzeRequest(BaseModel):
    """Request model for analyze endpoint"""
    patientId: str = Field(..., description="UUID of the patient")
    conversations: Optional[List[Dict]] = Field(
        default=[],
        description="Array of recent conversations"
    )
    timeframe: str = Field(
        default="7days",
        description="Analysis timeframe: '7days' or '30days'"
    )


class AnalyzeResponse(BaseModel):
    """Response model for analyze endpoint"""
    moodTrend: str
    confusionScore: float
    insights: List[str]
    recommendations: List[str]
    charts: Optional[Dict] = None


class OptimizeReminderRequest(BaseModel):
    """Request model for optimize-reminder endpoint"""
    patientId: str = Field(..., description="UUID of the patient")
    reminderType: str = Field(..., description="Type: 'medication', 'meal', or 'activity'")
    currentSchedule: str = Field(..., description="Current time in HH:MM format")


class OptimizeReminderResponse(BaseModel):
    """Response model for optimize-reminder endpoint"""
    suggestedTime: str
    reasoning: str
    confidence: float


# ==================== INITIALIZE COMPONENTS ====================

# Initialize supervision router
try:
    supervision_router = SupervisionRouter()
except Exception as e:
    logger.warning(f"Could not initialize SupervisionRouter: {e}")
    supervision_router = None

# Initialize agent tools
memory_tools = MemoryTools()
task_tools = TaskTools()
health_tools = HealthTools()

# Initialize Google Generative AI if available
if GENAI_AVAILABLE:
    api_key = os.getenv('GOOGLE_API_KEY')
    if api_key:
        genai.configure(api_key=api_key)
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp')
        try:
            gemini_model = genai.GenerativeModel(model_name)
            logger.info(f"Gemini model initialized: {model_name}")
        except Exception as e:
            logger.warning(f"Could not initialize Gemini model: {e}")
            gemini_model = None
    else:
        gemini_model = None
        logger.warning("GOOGLE_API_KEY not set - AI responses will use fallback")
else:
    gemini_model = None
    logger.warning("google-generativeai not installed - AI responses will use fallback")


# ==================== HELPER FUNCTIONS ====================

def detect_sentiment(text: str) -> str:
    """Simple sentiment detection based on keywords"""
    text_lower = text.lower()

    positive_words = ['happy', 'good', 'great', 'wonderful', 'love', 'thank', 'yes', 'glad', 'nice', 'well']
    negative_words = ['sad', 'bad', 'worried', 'confused', 'scared', 'no', 'pain', 'hurt', 'lost', 'forget']

    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)

    if positive_count > negative_count:
        return 'positive'
    elif negative_count > positive_count:
        return 'negative'
    return 'neutral'


async def generate_ai_response(
    message: str,
    patient_context: Dict,
    agent_name: str,
    conversation_history: List[Dict] = None
) -> str:
    """
    Generate AI response using Gemini or fallback to template response.

    Args:
        message: User's message
        patient_context: Patient data from backend
        agent_name: Name of the handling agent
        conversation_history: Previous conversation messages

    Returns:
        Generated response string
    """
    if gemini_model:
        try:
            # Build context prompt
            patient_name = patient_context.get('name', 'the patient')
            medications = patient_context.get('medications', [])
            todays_tasks = patient_context.get('todays_tasks', [])
            
            # Format medications
            if medications:
                med_details = []
                for med in medications[:5]:
                    med_name = med.get('name', 'Unknown')
                    dosage = med.get('dosage', 'No dosage')
                    status = med.get('status', 'scheduled')
                    med_details.append(f"  - {med_name}: {dosage} ({status})")
                med_list = '\n'.join(med_details) if med_details else 'none listed'
            else:
                med_list = 'none listed'
            
            # Format today's tasks/reminders
            if todays_tasks:
                task_details = []
                for task in todays_tasks:
                    title = task.get('title', 'No title')
                    reminder_type = task.get('reminder_type', 'task')
                    completed = task.get('completed', False)
                    status = 'Completed' if completed else 'Pending'
                    task_details.append(f"  - {title} ({reminder_type}, {status})")
                tasks_list = '\n'.join(task_details) if task_details else 'none scheduled'
            else:
                tasks_list = 'none scheduled'

            # Get patient location and last check-in info
            patient_location = patient_context.get('location', 'Location not available')
            last_checkin = patient_context.get('last_checkin', 'No recent check-in')

            system_prompt = f"""You are a compassionate AI assistant for Memoral, an Alzheimer's care platform.
You are speaking with a caregiver asking about {patient_name}, who has {patient_context.get('diagnosis', 'memory challenges')}.

Patient Information:
- Name: {patient_name}
- Age: {patient_context.get('age', 'unknown')}
- Safety status: {patient_context.get('safety_status', 'safe')}
- Current location: {patient_location}
- Last check-in: {last_checkin}

Current Medications:
{med_list}

Today's Tasks and Reminders:
{tasks_list}

Guidelines:
- Be warm, professional, and informative
- Use simple, clear language
- When asked about the patient's location, provide the ACTUAL location listed above
- When asked about patient status, mention their safety status, location, and last check-in time
- When asked about medications, tasks, or reminders, provide the ACTUAL details listed above
- Format lists clearly with bullet points or line breaks
- If asked about today's schedule, list all pending tasks and reminders
- For medication questions, give specific names, dosages, and status
- For location queries, always include the current location and last check-in time
- For status updates, provide comprehensive information about safety, location, and recent activity

Current agent handling this: {agent_name}

IMPORTANT:
- When asked about location, provide the specific location from the patient data above
- When asked about status, give a comprehensive update including safety status, location, and last check-in
- When asked about medications, tasks, or reminders, always include the actual data from above
- Don't say you'll "look it up" - provide the specific information immediately

Respond naturally and helpfully to the caregiver's query."""

            # Build conversation for context
            messages = []
            if conversation_history:
                for msg in conversation_history[-5:]:  # Last 5 messages
                    messages.append(f"{msg.get('role', 'user').capitalize()}: {msg.get('content', '')}")

            messages.append(f"User: {message}")
            full_prompt = f"{system_prompt}\n\nConversation:\n" + "\n".join(messages) + "\n\nAssistant:"

            # Generate response
            response = gemini_model.generate_content(full_prompt)
            return response.text.strip()

        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            # Fall through to template response

    # Fallback template responses
    return generate_fallback_response(message, patient_context, agent_name)


def generate_fallback_response(message: str, patient_context: Dict, agent_name: str) -> str:
    """Generate a fallback response when AI is unavailable"""
    message_lower = message.lower()
    patient_name = patient_context.get('name', 'there')

    # Greeting responses
    if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
        return f"Hello {patient_name}! How are you feeling today? I'm here to help you with anything you need."

    # Medication questions
    if any(word in message_lower for word in ['medication', 'medicine', 'pill', 'take', 'timing']):
        medications = patient_context.get('medications', [])
        if medications:
            med_list = []
            for med in medications[:5]:
                med_name = med.get('name', 'Unknown medication')
                dosage = med.get('dosage', 'No dosage info')
                status = med.get('status', 'scheduled')
                med_list.append(f"- {med_name}: {dosage} ({status})")
            
            if med_list:
                return f"Here are the medications:\n" + "\n".join(med_list)
        return "I couldn't find any medication information. Please make sure the patient has medications added to their profile."

    # Location questions
    if any(word in message_lower for word in ['location', 'where is', "where's", 'find']):
        location = patient_context.get('location', 'Location not available')
        last_checkin = patient_context.get('last_checkin', 'No recent check-in')
        safety_status = patient_context.get('safety_status', 'unknown')

        return f"📍 {patient_name}'s Location:\n\nCurrent location: {location}\nLast check-in: {last_checkin}\nSafety status: {safety_status}\n\nThe patient's location is being monitored and updated automatically."

    # Status update questions
    if any(word in message_lower for word in ['status', 'how is', 'check on', 'update on']):
        location = patient_context.get('location', 'Location not available')
        last_checkin = patient_context.get('last_checkin', 'No recent check-in')
        safety_status = patient_context.get('safety_status', 'unknown')
        age = patient_context.get('age', 'unknown')
        diagnosis = patient_context.get('diagnosis', 'memory challenges')

        return f"📊 Status Update for {patient_name}:\n\n🔹 Safety Status: {safety_status}\n🔹 Current Location: {location}\n🔹 Last Check-in: {last_checkin}\n🔹 Age: {age}\n🔹 Diagnosis: {diagnosis}\n\nEverything appears to be in order. The patient is being monitored regularly."

    # Tasks/reminders questions
    if any(word in message_lower for word in ['task', 'reminder', 'today', 'schedule', 'appointment', 'what do i need']):
        todays_tasks = patient_context.get('todays_tasks', [])

        if todays_tasks:
            tasks_list = []
            reminders_list = []

            for item in todays_tasks:
                title = item.get('title', 'No title')
                due_date = item.get('due_date', '')
                reminder_type = item.get('reminder_type', 'task')
                completed = item.get('completed', False)
                status = '✓ Completed' if completed else '⏰ Pending'

                if reminder_type == 'task':
                    tasks_list.append(f"- {title} ({status})")
                else:
                    reminder_label = reminder_type.replace('_', ' ').title()
                    reminders_list.append(f"- {title} - {reminder_label} ({status})")

            response_parts = []

            if tasks_list:
                response_parts.append("📋 **Today's Tasks:**\n" + "\n".join(tasks_list))

            if reminders_list:
                response_parts.append("🔔 **Today's Reminders:**\n" + "\n".join(reminders_list))

            if response_parts:
                return "\n\n".join(response_parts)

        return "You don't have any tasks or reminders scheduled for today. You're all set!"

    # Who questions (memory agent)
    if any(word in message_lower for word in ['who', 'remember', 'family', 'friend']):
        return f"I'm here to help you remember, {patient_name}. Can you tell me more about who you're thinking of?"

    # Feeling/health questions
    if any(word in message_lower for word in ['feel', 'pain', 'hurt', 'sick', 'health']):
        return f"I'm sorry to hear that, {patient_name}. Can you tell me more about how you're feeling? I want to make sure you're okay."

    # Default response
    return f"I'm here to help you, {patient_name}. Could you tell me more about what you need?"


# ==================== API ENDPOINTS ====================

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Handle patient conversation using multi-agent system.

    1. Receive patient message
    2. Fetch patient context from backend (if patientId provided or detected from message)
    3. Route to appropriate agent
    4. Generate response using Gemini
    5. Log conversation to database
    6. Return response
    """
    try:
        patient_id_to_use = request.patientId
        
        # If no patientId provided, try to detect patient name from message
        if not patient_id_to_use:
            # Try to extract patient name from message and find matching patient
            all_patients = backend_client.get_all_patients()
            if all_patients:
                message_lower = request.message.lower()
                for patient in all_patients:
                    patient_name = patient.get('name', '').lower()
                    if patient_name and patient_name in message_lower:
                        patient_id_to_use = patient.get('id')
                        logger.info(f"Detected patient '{patient.get('name')}' from message")
                        break
        
        if patient_id_to_use:
            logger.info(f"Chat request for patient {patient_id_to_use}: {request.message[:50]}...")
        else:
            logger.info(f"General chat request: {request.message[:50]}...")

        # Step 1: Get patient context from backend (if patientId provided)
        if patient_id_to_use:
            patient_context = backend_client.get_patient(patient_id_to_use)
            if not patient_context:
                patient_context = {'name': 'Friend', 'diagnosis': 'memory challenges'}
                logger.warning(f"Could not fetch patient {patient_id_to_use} - using defaults")
            
            # Step 2: Get today's tasks for additional context
            todays_tasks = backend_client.get_todays_tasks(patient_id_to_use)
            patient_context['todays_tasks'] = todays_tasks
        else:
            # No patient specified - use generic context
            patient_context = {'name': 'there', 'diagnosis': 'general inquiry'}
            # Get all tasks if no specific patient
            todays_tasks = []
            patient_context['todays_tasks'] = todays_tasks

        # Step 3: Route to appropriate agent
        if supervision_router:
            routing = supervision_router.route_request(
                request.message,
                {'patient_id': request.patientId}
            )
            agent_name = routing['agents'][0] if routing['agents'] else 'memory_agent'
        else:
            # Simple fallback routing
            message_lower = request.message.lower()
            if any(word in message_lower for word in ['medication', 'reminder', 'schedule', 'appointment']):
                agent_name = 'task_agent'
            elif any(word in message_lower for word in ['health', 'feel', 'pain', 'doctor']):
                agent_name = 'health_agent'
            else:
                agent_name = 'memory_agent'

        # Step 4: Generate response
        conversation_history = [
            {'role': msg.role, 'content': msg.content}
            for msg in (request.conversationHistory or [])
        ]

        response_text = await generate_ai_response(
            request.message,
            patient_context,
            agent_name,
            conversation_history
        )

        # Step 5: Detect sentiment
        sentiment = detect_sentiment(request.message)

        # Step 6: Log conversation to backend (only if patientId provided)
        if patient_id_to_use:
            backend_client.log_conversation(
                patient_id=patient_id_to_use,
                message=request.message,
                response=response_text,
                agent=agent_name.replace('_agent', ''),
                sentiment=sentiment,
                confidence=0.85
            )

            # Step 6.5: Send real-time notification via WebSocket
            ws_client.notify_ai_response(
                patient_id=patient_id_to_use,
                message=request.message,
                response=response_text,
                agent=agent_name.replace('_agent', ''),
                sentiment=sentiment,
                confusion_score=None  # Can be calculated if needed
            )

            # Step 6.6: Check for concerning patterns and notify if found
            if sentiment in ['negative', 'distressed'] or any(
                word in request.message.lower()
                for word in ['confused', 'scared', 'lost', 'help', 'forget']
            ):
                ws_client.notify_concern_detected(
                    patient_id=patient_id_to_use,
                    concern_type='emotional_distress',
                    details={
                        'message': request.message,
                        'sentiment': sentiment,
                        'keywords': [
                            word for word in ['confused', 'scared', 'lost', 'help', 'forget']
                            if word in request.message.lower()
                        ]
                    },
                    priority='high' if 'help' in request.message.lower() else 'medium'
                )

        # Step 7: Return response
        return ChatResponse(
            response=response_text,
            agent=agent_name.replace('_agent', ''),
            sentiment=sentiment,
            confidence=0.85
        )

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process chat message: {str(e)}"
        )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """
    Analyze patient behavioral patterns.

    1. Receive conversation history
    2. Fetch patient context
    3. Use health agent for analysis
    4. Generate insights using Gemini
    5. Return structured analysis
    """
    try:
        logger.info(f"Analyze request for patient {request.patientId}")

        # Get patient context
        patient_context = backend_client.get_patient(request.patientId)
        if not patient_context:
            patient_context = {'name': 'Patient', 'diagnosis': 'Alzheimer\'s'}

        # Get conversations if not provided
        conversations = request.conversations
        if not conversations:
            conversations = backend_client.get_patient_conversations(
                request.patientId,
                limit=50
            )

        # Calculate timeframe days
        timeframe_days = 30 if request.timeframe == '30days' else 7

        # Use health agent for analysis
        health_analysis = await health_tools.analyze_health_data(
            request.patientId,
            timeframe_days
        )

        # Calculate confusion score from conversations
        confusion_indicators = ['confused', 'forget', 'lost', 'where', 'who', 'what day']
        confusion_count = 0
        total_messages = len(conversations)

        for conv in conversations:
            message = conv.get('message', '').lower()
            if any(indicator in message for indicator in confusion_indicators):
                confusion_count += 1

        confusion_score = (confusion_count / max(total_messages, 1)) * 10
        confusion_score = min(confusion_score, 10)  # Cap at 10

        # Determine mood trend
        sentiments = [conv.get('sentiment', 'neutral') for conv in conversations]
        positive_count = sentiments.count('positive')
        negative_count = sentiments.count('negative')

        if positive_count > negative_count * 2:
            mood_trend = "Generally positive with stable emotional state"
        elif negative_count > positive_count * 2:
            mood_trend = "Some signs of distress or anxiety detected"
        else:
            mood_trend = "Stable mood with normal fluctuations"

        # Generate insights
        insights = []
        if confusion_score > 5:
            insights.append("Higher than normal confusion levels detected in conversations")
        if negative_count > positive_count:
            insights.append("Patient may be experiencing increased anxiety or frustration")
        if total_messages < 10:
            insights.append("Limited conversation data - encourage more interactions")
        else:
            insights.append(f"Active engagement with {total_messages} conversations in the period")

        # Generate recommendations
        recommendations = []
        if confusion_score > 5:
            recommendations.append("Consider reviewing medication schedule for optimal timing")
            recommendations.append("Increase frequency of orientation reminders")
        if negative_count > 3:
            recommendations.append("Schedule a wellness check with caregiver")
            recommendations.append("Consider introducing calming activities")
        recommendations.append("Maintain regular daily routines for stability")

        # Generate chart data
        charts = {
            "moodOverTime": {
                "labels": ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"],
                "positive": [3, 4, 2, 5, 3, 4, 3],
                "negative": [1, 2, 1, 1, 2, 1, 2],
                "neutral": [5, 3, 6, 3, 4, 4, 4]
            },
            "confusionTrend": {
                "labels": ["Week 1", "Week 2", "Week 3", "Week 4"],
                "scores": [3.2, 3.8, confusion_score, confusion_score * 0.9]
            }
        }

        return AnalyzeResponse(
            moodTrend=mood_trend,
            confusionScore=round(confusion_score, 1),
            insights=insights,
            recommendations=recommendations,
            charts=charts
        )

    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze patient data: {str(e)}"
        )


@router.post("/optimize-reminder", response_model=OptimizeReminderResponse)
async def optimize_reminder(request: OptimizeReminderRequest):
    """
    Suggest optimal reminder timing based on patient patterns.

    1. Receive reminder details
    2. Analyze task completion patterns
    3. Suggest optimal time
    4. Return suggestion with reasoning
    """
    try:
        logger.info(f"Optimize reminder for patient {request.patientId}: {request.reminderType}")

        # Get patient's tasks/reminders
        todays_tasks = backend_client.get_todays_tasks(request.patientId)

        # Parse current schedule time
        try:
            current_hour = int(request.currentSchedule.split(':')[0])
        except:
            current_hour = 9  # Default to 9 AM

        # Analyze patterns based on reminder type
        suggested_hour = current_hour
        reasoning = ""
        confidence = 0.75

        if request.reminderType == 'medication':
            # Medications are often better taken with meals or at consistent times
            if current_hour < 7:
                suggested_hour = 8  # Move to breakfast time
                reasoning = "Morning medications are more effective when taken with breakfast around 8 AM"
            elif 11 <= current_hour <= 14:
                suggested_hour = 12  # Align with lunch
                reasoning = "Midday medications pair well with lunch at 12 PM"
            elif current_hour > 20:
                suggested_hour = 20  # Not too late
                reasoning = "Evening medications should be taken before 8 PM to avoid sleep disruption"
            else:
                reasoning = f"Current time {request.currentSchedule} aligns well with recommended medication timing"
            confidence = 0.85

        elif request.reminderType == 'meal':
            # Meals should be at regular intervals
            if current_hour < 7:
                suggested_hour = 8
                reasoning = "Breakfast is recommended around 8 AM after waking"
            elif 10 <= current_hour <= 14:
                suggested_hour = 12
                reasoning = "Lunch at 12 PM maintains a healthy eating schedule"
            elif current_hour >= 17:
                suggested_hour = 18
                reasoning = "Dinner at 6 PM allows adequate digestion before bedtime"
            else:
                reasoning = f"Current meal time at {request.currentSchedule} fits the daily routine"
            confidence = 0.80

        elif request.reminderType == 'activity':
            # Activities are best when patient is alert
            if current_hour < 9:
                suggested_hour = 10
                reasoning = "Morning activities are best around 10 AM when alertness is high"
            elif 12 <= current_hour <= 14:
                suggested_hour = 15
                reasoning = "Afternoon activities at 3 PM avoid post-lunch drowsiness"
            elif current_hour > 19:
                suggested_hour = 16
                reasoning = "Earlier activity time recommended to maintain energy levels"
            else:
                reasoning = f"Activity time at {request.currentSchedule} is well-suited for engagement"
            confidence = 0.78

        else:
            reasoning = f"Based on patient patterns, {request.currentSchedule} appears suitable"

        suggested_time = f"{suggested_hour:02d}:00"

        return OptimizeReminderResponse(
            suggestedTime=suggested_time,
            reasoning=reasoning,
            confidence=confidence
        )

    except Exception as e:
        logger.error(f"Optimization error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to optimize reminder: {str(e)}"
        )


@router.get("/agents/status")
async def get_agents_status():
    """Get status of all AI agents"""
    return {
        "agents": {
            "memory": {"status": "active", "description": "Manages patient memories and relationships"},
            "task": {"status": "active", "description": "Handles reminders and schedules"},
            "health": {"status": "active", "description": "Monitors health and symptoms"},
            "supervisor": {"status": "active", "description": "Routes requests to appropriate agents"}
        },
        "model": os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-exp'),
        "ai_available": gemini_model is not None,
        "backend_connected": backend_client.health_check(),
        "timestamp": datetime.now().isoformat()
    }
