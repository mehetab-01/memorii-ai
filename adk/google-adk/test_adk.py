"""
Simple test to check if Google ADK agents work
Run this BEFORE starting the full backend
"""

# Test if your agents can be imported
try:
    from agents.memory_agent import MemoryAgent
    print("✅ MemoryAgent imported successfully!")
except Exception as e:
    print(f"❌ MemoryAgent import failed: {e}")

try:
    from agents.task_agent import TaskAgent
    print("✅ TaskAgent imported successfully!")
except Exception as e:
    print(f"❌ TaskAgent import failed: {e}")

try:
    from agents.health_agent import HealthAgent
    print("✅ HealthAgent imported successfully!")
except Exception as e:
    print(f"❌ HealthAgent import failed: {e}")

try:
    from agents.supervision_agent import SupervisionAgent
    print("✅ SupervisionAgent imported successfully!")
except Exception as e:
    print(f"❌ SupervisionAgent import failed: {e}")

# Test creating an agent instance
try:
    # memory_agent = MemoryAgent()
    # print("✅ MemoryAgent instance created!")
    print("⚠️  Agent instance test skipped (uncomment when agents are implemented)")
except Exception as e:
    print(f"❌ Agent instance creation failed: {e}")

print("\n🎉 Google ADK basic test complete!")