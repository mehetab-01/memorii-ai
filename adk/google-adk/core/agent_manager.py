"""
Agent Manager
Manages agent lifecycle, initialization, and coordination
"""

from typing import Dict, List, Optional, Any
import yaml
import importlib
from pathlib import Path


class AgentManager:
    """Manages all agents in the system"""
    
    def __init__(self, config_path: str = "config.yaml"):
        """
        Initialize Agent Manager
        
        Args:
            config_path: Path to configuration file
        """
        self.config = self._load_config(config_path)
        self.agents = {}
        self.agent_configs = {}
        
        self._initialize_agents()
    
    def _load_config(self, config_path: str) -> Dict[str, Any]:
        """Load main configuration"""
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def _initialize_agents(self):
        """Initialize all configured agents"""
        agents_config = self.config.get('adk', {}).get('agents', {})
        
        for agent_key, agent_info in agents_config.items():
            if agent_info.get('enabled', True):
                agent_name = agent_info['name']
                self._load_agent(agent_name)
    
    def _load_agent(self, agent_name: str):
        """
        Load a specific agent
        
        Args:
            agent_name: Name of the agent to load
        """
        # Load agent configuration
        agent_config_path = f"agents/{agent_name}/agent.yaml"
        
        try:
            with open(agent_config_path, 'r') as f:
                agent_config = yaml.safe_load(f)
            
            self.agent_configs[agent_name] = agent_config
            
            # Import agent tools
            tools_module = importlib.import_module(f"agents.{agent_name}.{agent_name.replace('_agent', '_tools')}")
            
            self.agents[agent_name] = {
                "config": agent_config,
                "tools": tools_module,
                "status": "active"
            }
            
            print(f"✅ Loaded agent: {agent_name}")
            
        except Exception as e:
            print(f"❌ Failed to load agent {agent_name}: {str(e)}")
    
    def get_agent(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """
        Get agent by name
        
        Args:
            agent_name: Name of the agent
            
        Returns:
            Agent data or None
        """
        return self.agents.get(agent_name)
    
    def get_all_agents(self) -> Dict[str, Any]:
        """Get all active agents"""
        return self.agents
    
    def get_agent_status(self, agent_name: str) -> str:
        """Get status of a specific agent"""
        agent = self.agents.get(agent_name)
        return agent.get("status", "unknown") if agent else "not_found"
    
    async def execute_agent_tool(
        self,
        agent_name: str,
        tool_name: str,
        **kwargs
    ) -> Any:
        """
        Execute a tool from a specific agent
        
        Args:
            agent_name: Name of the agent
            tool_name: Name of the tool to execute
            **kwargs: Tool arguments
            
        Returns:
            Tool execution result
        """
        agent = self.get_agent(agent_name)
        
        if not agent:
            raise ValueError(f"Agent '{agent_name}' not found")
        
        tools = agent.get("tools")
        
        if not hasattr(tools, tool_name):
            raise ValueError(f"Tool '{tool_name}' not found in agent '{agent_name}'")
        
        tool_function = getattr(tools, tool_name)
        
        # Execute the tool
        result = await tool_function(**kwargs)
        
        return result
    
    def reload_agent(self, agent_name: str):
        """Reload an agent (useful for development)"""
        if agent_name in self.agents:
            del self.agents[agent_name]
        
        self._load_agent(agent_name)
    
    def get_agent_capabilities(self, agent_name: str) -> List[str]:
        """Get capabilities of an agent"""
        config = self.agent_configs.get(agent_name, {})
        return config.get('agent', {}).get('capabilities', [])
    
    def get_agent_tools(self, agent_name: str) -> List[str]:
        """Get available tools for an agent"""
        config = self.agent_configs.get(agent_name, {})
        return config.get('agent', {}).get('tools', [])


# Initialize global agent manager
agent_manager = AgentManager()