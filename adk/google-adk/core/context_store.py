"""
Context Store
Manages conversation context and state across agents
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from collections import deque


class ContextStore:
    """Stores and manages conversation context"""
    
    def __init__(self, max_history: int = 50):
        """
        Initialize Context Store
        
        Args:
            max_history: Maximum number of conversation turns to store
        """
        self.max_history = max_history
        self.contexts = {}  # patient_id -> context data
    
    def get_context(self, patient_id: str) -> Dict[str, Any]:
        """
        Get context for a patient
        
        Args:
            patient_id: Patient identifier
            
        Returns:
            Context data
        """
        if patient_id not in self.contexts:
            self.contexts[patient_id] = self._create_new_context(patient_id)
        
        return self.contexts[patient_id]
    
    def _create_new_context(self, patient_id: str) -> Dict[str, Any]:
        """Create new context for a patient"""
        return {
            "patient_id": patient_id,
            "conversation_history": deque(maxlen=self.max_history),
            "session_start": datetime.now().isoformat(),
            "last_interaction": datetime.now().isoformat(),
            "active_agents": [],
            "patient_state": {},
            "pending_tasks": [],
            "metadata": {}
        }
    
    def add_message(
        self,
        patient_id: str,
        role: str,
        content: str,
        agent_name: Optional[str] = None
    ):
        """
        Add a message to conversation history
        
        Args:
            patient_id: Patient identifier
            role: Message role (user/assistant)
            content: Message content
            agent_name: Name of the agent (if assistant message)
        """
        context = self.get_context(patient_id)
        
        message = {
            "role": role,
            "content": content,
            "agent_name": agent_name,
            "timestamp": datetime.now().isoformat()
        }
        
        context["conversation_history"].append(message)
        context["last_interaction"] = datetime.now().isoformat()
    
    def get_conversation_history(
        self,
        patient_id: str,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Get conversation history
        
        Args:
            patient_id: Patient identifier
            limit: Maximum number of messages to return
            
        Returns:
            List of messages
        """
        context = self.get_context(patient_id)
        history = list