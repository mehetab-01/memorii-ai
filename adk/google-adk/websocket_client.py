"""
WebSocket Client for Python ADK
Sends real-time updates to backend when AI generates responses or detects concerns
"""

import socketio
import os
from datetime import datetime
from typing import Optional, Dict, Any
import logging

# Set up logging
logger = logging.getLogger(__name__)

class WebSocketClient:
    """WebSocket client for ADK to backend communication"""

    def __init__(self):
        self.sio = socketio.Client(
            reconnection=True,
            reconnection_delay=1,
            reconnection_attempts=10,
            logger=False,
            engineio_logger=False
        )
        self.backend_url = os.getenv('BACKEND_API_URL', 'http://localhost:8000')
        self.connected = False

        # Set up event handlers
        self.setup_event_handlers()

    def setup_event_handlers(self):
        """Set up Socket.io event handlers"""

        @self.sio.event
        def connect():
            logger.info("[ADK WebSocket] Connected to backend")
            self.connected = True

        @self.sio.event
        def disconnect():
            logger.info("[ADK WebSocket] Disconnected from backend")
            self.connected = False

        @self.sio.event
        def connect_error(data):
            logger.error(f"[ADK WebSocket] Connection error: {data}")
            self.connected = False

    def connect(self) -> bool:
        """
        Connect to backend WebSocket server

        Returns:
            bool: True if connected successfully, False otherwise
        """
        if self.connected:
            logger.info("[ADK WebSocket] Already connected")
            return True

        try:
            logger.info(f"[ADK WebSocket] Connecting to {self.backend_url}")
            self.sio.connect(self.backend_url, transports=['websocket', 'polling'])
            return True
        except Exception as e:
            logger.error(f"[ADK WebSocket] Connection failed: {e}")
            return False

    def disconnect(self):
        """Disconnect from WebSocket server"""
        if self.connected:
            self.sio.disconnect()
            logger.info("[ADK WebSocket] Disconnected")

    def notify_ai_response(
        self,
        patient_id: str,
        message: str,
        response: str,
        agent: str,
        sentiment: str,
        confusion_score: Optional[float] = None
    ) -> bool:
        """
        Notify backend when AI generates a response
        Backend will forward to mobile app and dashboard

        Args:
            patient_id: Patient ID
            message: Original message from patient
            response: AI-generated response
            agent: Which agent generated the response
            sentiment: Detected sentiment (neutral, positive, negative, distressed)
            confusion_score: Confusion score (0-10)

        Returns:
            bool: True if notification sent successfully
        """
        if not self.connected:
            logger.warning("[ADK WebSocket] Not connected, cannot send AI response notification")
            return False

        try:
            data = {
                'patientId': patient_id,
                'message': message,
                'response': response,
                'agent': agent,
                'sentiment': sentiment,
                'confusionScore': confusion_score,
                'timestamp': datetime.now().isoformat()
            }

            self.sio.emit('adk:response_generated', data)
            logger.info(f"[ADK WebSocket] Sent AI response notification for patient {patient_id}")
            return True
        except Exception as e:
            logger.error(f"[ADK WebSocket] Error sending AI response: {e}")
            return False

    def notify_concern_detected(
        self,
        patient_id: str,
        concern_type: str,
        details: Dict[str, Any],
        priority: str = 'medium'
    ) -> bool:
        """
        Notify backend when AI detects a concerning pattern

        Args:
            patient_id: Patient ID
            concern_type: Type of concern (emotional_distress, cognitive_decline, etc.)
            details: Additional details about the concern
            priority: Priority level (low, medium, high, urgent)

        Returns:
            bool: True if notification sent successfully
        """
        if not self.connected:
            logger.warning("[ADK WebSocket] Not connected, cannot send concern notification")
            return False

        try:
            data = {
                'patientId': patient_id,
                'concernType': concern_type,
                'details': details,
                'priority': priority,
                'timestamp': datetime.now().isoformat()
            }

            self.sio.emit('adk:concern_detected', data)
            logger.info(f"[ADK WebSocket] Sent concern notification: {concern_type} ({priority}) for patient {patient_id}")
            return True
        except Exception as e:
            logger.error(f"[ADK WebSocket] Error sending concern notification: {e}")
            return False

    def is_connected(self) -> bool:
        """Check if connected to WebSocket server"""
        return self.connected


# Global WebSocket client instance
ws_client = WebSocketClient()


# Auto-connect on import (optional - can be called explicitly)
def initialize_websocket():
    """Initialize WebSocket connection"""
    ws_client.connect()
