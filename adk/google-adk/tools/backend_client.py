"""
Backend Client
HTTP client that allows Python agents to call Node.js backend for data operations
"""

import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class BackendClient:
    """
    HTTP client for communicating with the Node.js backend.
    Allows Python agents to fetch patient data and log conversations/alerts.
    """

    def __init__(self, base_url: Optional[str] = None, timeout: int = 30):
        """
        Initialize the backend client.

        Args:
            base_url: Base URL of the Node.js backend (default: from env)
            timeout: Request timeout in seconds (default: 30)
        """
        self.base_url = base_url or os.getenv('BACKEND_API_URL', 'http://localhost:8000')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Optional[Any]:
        """
        Make an HTTP request to the backend.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (e.g., /api/patients)
            data: Request body for POST/PUT
            params: Query parameters

        Returns:
            Response data or None on error
        """
        url = f"{self.base_url}{endpoint}"

        try:
            logger.debug(f"Making {method} request to {url}")

            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                timeout=self.timeout
            )

            response.raise_for_status()

            if response.content:
                return response.json()
            return None

        except requests.exceptions.Timeout:
            logger.error(f"Request timeout: {url}")
            return None
        except requests.exceptions.ConnectionError:
            logger.error(f"Connection error: Cannot connect to backend at {url}")
            return None
        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
            return None
        except Exception as e:
            logger.error(f"Request failed: {str(e)}")
            return None

    # ==================== PATIENT OPERATIONS ====================

    def get_patient(self, patient_id: str) -> Optional[Dict]:
        """
        Get patient by ID with medications.

        Args:
            patient_id: UUID of the patient

        Returns:
            Patient object with medications or None
        """
        return self._make_request('GET', f'/api/patients/{patient_id}')

    def get_all_patients(self) -> List[Dict]:
        """
        Get all patients.

        Returns:
            List of patients or empty list
        """
        result = self._make_request('GET', '/api/patients')
        return result if result else []

    def get_patient_medications(self, patient_id: str) -> List[Dict]:
        """
        Get medications for a specific patient.

        Args:
            patient_id: UUID of the patient

        Returns:
            List of medications or empty list
        """
        result = self._make_request('GET', f'/api/medications/patient/{patient_id}')
        return result if result else []

    # ==================== REMINDER/TASK OPERATIONS ====================

    def get_todays_tasks(self, patient_id: str) -> List[Dict]:
        """
        Get today's tasks/reminders for a patient.

        Args:
            patient_id: UUID of the patient

        Returns:
            List of today's reminders or empty list
        """
        result = self._make_request('GET', f'/api/reminders/patient/{patient_id}/today')
        return result if result else []

    def get_all_reminders(self) -> List[Dict]:
        """
        Get all reminders.

        Returns:
            List of reminders or empty list
        """
        result = self._make_request('GET', '/api/reminders')
        return result if result else []

    def create_reminder(self, reminder_data: Dict) -> Optional[Dict]:
        """
        Create a new reminder.

        Args:
            reminder_data: Reminder data (patient_id, title, due_date, etc.)

        Returns:
            Created reminder or None
        """
        return self._make_request('POST', '/api/reminders', data=reminder_data)

    def complete_reminder(self, reminder_id: str) -> Optional[Dict]:
        """
        Mark a reminder as completed.

        Args:
            reminder_id: UUID of the reminder

        Returns:
            Updated reminder or None
        """
        return self._make_request('PUT', f'/api/reminders/{reminder_id}/complete')

    # ==================== NOTES OPERATIONS ====================

    def get_patient_notes(self, patient_id: str) -> List[Dict]:
        """
        Get notes for a patient.

        Args:
            patient_id: UUID of the patient

        Returns:
            List of notes or empty list
        """
        result = self._make_request('GET', f'/api/notes/patient/{patient_id}')
        return result if result else []

    def create_note(self, note_data: Dict) -> Optional[Dict]:
        """
        Create a note for a patient.

        Args:
            note_data: Note data (patient_id, content)

        Returns:
            Created note or None
        """
        return self._make_request('POST', '/api/notes', data=note_data)

    # ==================== FAMILY OPERATIONS ====================

    def get_family_members(self, patient_id: str) -> List[Dict]:
        """
        Get family members for a patient.
        Note: This endpoint may not exist yet - returns mock data.

        Args:
            patient_id: UUID of the patient

        Returns:
            List of family members or empty list
        """
        # Try to fetch from backend, fall back to empty list
        result = self._make_request('GET', f'/api/patients/{patient_id}/family')
        if result:
            return result

        # Return empty list if endpoint doesn't exist
        logger.debug(f"Family endpoint not available for patient {patient_id}")
        return []

    # ==================== ALERT OPERATIONS ====================

    def create_alert(
        self,
        patient_id: str,
        alert_type: str,
        message: str,
        priority: str = 'medium'
    ) -> Optional[Dict]:
        """
        Create a caregiver alert.

        Args:
            patient_id: UUID of the patient
            alert_type: Type of alert (e.g., 'confusion', 'emergency', 'medication')
            message: Alert message
            priority: Alert priority ('low', 'medium', 'high', 'critical')

        Returns:
            Created alert or None
        """
        alert_data = {
            'patient_id': patient_id,
            'alert_type': alert_type,
            'message': message,
            'priority': priority
        }
        return self._make_request('POST', '/api/alerts', data=alert_data)

    def get_patient_alerts(self, patient_id: str) -> List[Dict]:
        """
        Get alerts for a patient.

        Args:
            patient_id: UUID of the patient

        Returns:
            List of alerts or empty list
        """
        result = self._make_request('GET', f'/api/alerts/patient/{patient_id}')
        return result if result else []

    def acknowledge_alert(self, alert_id: str) -> Optional[Dict]:
        """
        Acknowledge an alert.

        Args:
            alert_id: UUID of the alert

        Returns:
            Updated alert or None
        """
        return self._make_request('PUT', f'/api/alerts/{alert_id}/acknowledge')

    # ==================== CONVERSATION OPERATIONS ====================

    def log_conversation(
        self,
        patient_id: str,
        message: str,
        response: str,
        agent: str,
        sentiment: Optional[str] = None,
        confidence: Optional[float] = None
    ) -> Optional[Dict]:
        """
        Log a conversation to the database.

        Args:
            patient_id: UUID of the patient
            message: User's message
            response: Agent's response
            agent: Name of the agent that handled the request
            sentiment: Detected sentiment ('positive', 'neutral', 'negative')
            confidence: Confidence score (0-1)

        Returns:
            Created conversation log or None
        """
        conversation_data = {
            'patient_id': patient_id,
            'message': message,
            'response': response,
            'agent': agent,
            'sentiment': sentiment,
            'confidence': confidence
        }
        return self._make_request('POST', '/api/conversations', data=conversation_data)

    def get_patient_conversations(
        self,
        patient_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """
        Get recent conversations for a patient.

        Args:
            patient_id: UUID of the patient
            limit: Maximum number of conversations to return

        Returns:
            List of conversations or empty list
        """
        result = self._make_request(
            'GET',
            f'/api/conversations/patient/{patient_id}',
            params={'limit': limit}
        )
        return result if result else []

    # ==================== DASHBOARD OPERATIONS ====================

    def get_dashboard_overview(self) -> Optional[Dict]:
        """
        Get dashboard overview data.

        Returns:
            Dashboard overview or None
        """
        return self._make_request('GET', '/api/dashboard/overview')

    def get_patient_dashboard(self, patient_id: str) -> Optional[Dict]:
        """
        Get patient-specific dashboard data.

        Args:
            patient_id: UUID of the patient

        Returns:
            Patient dashboard data or None
        """
        return self._make_request('GET', f'/api/dashboard/patient/{patient_id}')

    # ==================== HEALTH CHECK ====================

    def health_check(self) -> bool:
        """
        Check if the backend is healthy.

        Returns:
            True if backend is healthy, False otherwise
        """
        try:
            response = self.session.get(
                f"{self.base_url}/health",
                timeout=5
            )
            return response.status_code == 200
        except Exception:
            return False


# Create singleton instance
backend_client = BackendClient()
