"""
Supervision Agent Router
Handles request routing and agent coordination
"""

import re
from typing import Dict, List, Any
import yaml


class SupervisionRouter:
    """Routes requests to appropriate agents based on intent classification"""
    
    def __init__(self, config_path: str = "agents/supervision_agent/agent.yaml"):
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        self.routing_rules = self._load_routing_rules()
    
    def _load_routing_rules(self) -> Dict[str, List[str]]:
        """Load routing rules for each agent"""
        return {
            "memory_agent": [
                r"\b(who is|recognize|remember|family|friend|relation|name|preference)\b",
                r"\b(bio|biography|profile|personal|identity)\b"
            ],
            "task_agent": [
                r"\b(remind|schedule|appointment|medication|pill|routine|task)\b",
                r"\b(calendar|timer|alarm|notification)\b",
                r"\b(today'?s? tasks?|reminder|due|what do i need|what should i do)\b"
            ],
            "health_agent": [
                r"\b(health|symptom|pain|vitals|feeling|sick|doctor|emergency)\b",
                r"\b(blood pressure|heart rate|temperature|analyze)\b",
                r"\b(location|where|status|how is|check on|update on|safe|patient.*location)\b"
            ]
        }
    
    def classify_intent(self, message: str) -> List[str]:
        """
        Classify the intent of a message and return appropriate agent(s)
        
        Args:
            message: User's message
            
        Returns:
            List of agent names that should handle this request
        """
        message_lower = message.lower()
        agents_needed = []
        
        for agent_name, patterns in self.routing_rules.items():
            for pattern in patterns:
                if re.search(pattern, message_lower):
                    if agent_name not in agents_needed:
                        agents_needed.append(agent_name)
                    break
        
        if not agents_needed:
            agents_needed.append("memory_agent")
        
        return agents_needed
    
    def route_request(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Route a request to appropriate agent(s)
        
        Args:
            message: User's message
            context: Request context
            
        Returns:
            Routing decision
        """
        agents = self.classify_intent(message)
        
        emergency_keywords = ["emergency", "urgent", "help", "critical", "fall", "chest pain"]
        is_emergency = any(keyword in message.lower() for keyword in emergency_keywords)
        
        routing_decision = {
            "agents": agents,
            "priority": "critical" if is_emergency else "normal",
            "parallel": len(agents) > 1,
            "context": context,
            "message": message
        }
        
        return routing_decision
    
    def coordinate_responses(self, responses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Coordinate and merge responses from multiple agents"""
        if len(responses) == 1:
            return responses[0]
        
        coordinated = {
            "type": "coordinated_response",
            "agents_involved": [r.get("agent_name") for r in responses],
            "responses": responses,
            "summary": self._generate_summary(responses)
        }
        
        return coordinated
    
    def _generate_summary(self, responses: List[Dict[str, Any]]) -> str:
        """Generate a summary from multiple agent responses"""
        summaries = []
        for response in responses:
            if "content" in response:
                summaries.append(response["content"])
        
        return " ".join(summaries)