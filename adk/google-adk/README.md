# Memoral ADK Service - Google ADK Implementation

AI-Powered Multi-Agent System for Alzheimer's Care using Google Agent Development Kit

## Architecture Overview

This service is part of the Memoral 3-service microservices architecture:

```
┌─────────────────┐
│   Frontend      │  Next.js - Port 3000
│   (Next.js)     │
└────────┬────────┘
         │ HTTP
         ↓
┌────────────────────────────┐
│   Backend                  │  Node.js/Express - Port 8000
│   (Express + Supabase)     │
│                            │
│  - Patient CRUD            │
│  - Reminders CRUD          │
│  - AI Proxy Layer          │
└──────┬──────────────┬──────┘
       │              │
       │              │ HTTP
       ↓              ↓
┌─────────────┐  ┌──────────────────┐
│  Supabase   │  │  Google ADK      │  Python/FastAPI - Port 5000 (THIS SERVICE)
│  (Database) │  │  (AI Agents)     │
└─────────────┘  └──────────────────┘
```

## Multi-Agent System

This project implements a multi-agent system with 4 specialized agents:

- **Supervision Agent**: Central orchestrator and request router
- **Memory Agent**: Manages patient info, relationships, and memories
- **Task Agent**: Handles reminders, schedules, and routines
- **Health Agent**: Monitors health metrics and symptoms

## Project Structure

```
google-adk/
├── agents/                    # Agent definitions and tools
│   ├── memory_agent/
│   │   ├── agent.yaml        # Agent configuration
│   │   └── memory_tools.py   # Memory management tools
│   ├── task_agent/
│   │   ├── agent.yaml
│   │   └── task_tools.py     # Task/reminder tools
│   ├── health_agent/
│   │   ├── agent.yaml
│   │   └── health_tools.py   # Health monitoring tools
│   └── supervision_agent/
│       ├── agent.yaml
│       └── router.py         # Request routing logic
├── api/
│   ├── main.py               # FastAPI application entry
│   ├── routes.py             # AI endpoints (/chat, /analyze, etc.)
│   └── agent_routes.py       # Legacy agent routes
├── core/
│   ├── agent_manager.py      # Agent lifecycle management
│   └── context_store.py      # Conversation state management
├── tools/
│   ├── backend_client.py     # HTTP client for Node.js backend
│   ├── analytics.py
│   ├── database.py
│   └── notification.py
├── tests/                    # Unit tests
├── config.yaml               # Agent configuration
├── requirements.txt          # Python dependencies
├── .env.example              # Environment template
└── README.md                 # This file
```

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js backend running on port 8000
- Google API key for Gemini

### 1. Setup Environment

```bash
# Navigate to the ADK directory
cd google-adk/google_adk/google-adk

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your credentials (especially GOOGLE_API_KEY)
# On Windows, use notepad or your preferred editor
notepad .env
```

Required environment variables:
- `GOOGLE_API_KEY`: Your Gemini API key from https://makersuite.google.com/app/apikey
- `BACKEND_API_URL`: Node.js backend URL (default: http://localhost:8000)

### 3. Run the Application

```bash
# Start the FastAPI server
uvicorn api.main:app --reload --port 5000

# Or run directly
python -m uvicorn api.main:app --reload --port 5000
```

### 4. Verify Installation

```bash
# Health check
curl http://localhost:5000/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "memoral-adk",
#   "agents": ["memory", "task", "health", "supervisor"],
#   "model": "gemini-2.0-flash-exp"
# }
```

## API Endpoints

### Health Check
```
GET /health
```
Returns service status and available agents.

### Chat with Patient
```
POST /api/chat
Content-Type: application/json

{
  "patientId": "uuid-of-patient",
  "message": "Did I take my medicine today?",
  "conversationHistory": []  // Optional
}

Response:
{
  "response": "Let me check your medication schedule...",
  "agent": "task",
  "sentiment": "neutral",
  "confidence": 0.85
}
```

### Analyze Patient Behavior
```
POST /api/analyze
Content-Type: application/json

{
  "patientId": "uuid-of-patient",
  "timeframe": "7days"  // or "30days"
}

Response:
{
  "moodTrend": "Generally positive with stable emotional state",
  "confusionScore": 3.5,
  "insights": ["Active engagement with conversations"],
  "recommendations": ["Maintain regular daily routines"],
  "charts": {...}
}
```

### Optimize Reminder Timing
```
POST /api/optimize-reminder
Content-Type: application/json

{
  "patientId": "uuid-of-patient",
  "reminderType": "medication",  // or "meal", "activity"
  "currentSchedule": "09:00"
}

Response:
{
  "suggestedTime": "08:00",
  "reasoning": "Morning medications are more effective with breakfast",
  "confidence": 0.85
}
```

### Agent Status
```
GET /api/agents/status
```
Returns status of all AI agents.

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run specific agent tests
pytest tests/test_memory_agent.py -v
pytest tests/test_task_agent.py -v
pytest tests/test_health_agent.py -v
pytest tests/test_supervision_agent.py -v

# Test with coverage
pytest tests/ --cov=. --cov-report=html
```

### Manual Testing

```bash
# Test chat endpoint
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"patientId": "test-123", "message": "Hello, how are you?"}'

# Test analyze endpoint
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"patientId": "test-123", "timeframe": "7days"}'

# Test optimize-reminder endpoint
curl -X POST http://localhost:5000/api/optimize-reminder \
  -H "Content-Type: application/json" \
  -d '{"patientId": "test-123", "reminderType": "medication", "currentSchedule": "09:00"}'
```

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

## Configuration

### config.yaml

Edit `config.yaml` to customize:
- Agent settings and priorities
- Model parameters (temperature, max tokens)
- Logging configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Gemini API key | Required |
| `GEMINI_MODEL` | Gemini model to use | `gemini-2.0-flash-exp` |
| `GEMINI_TEMPERATURE` | Response creativity (0-1) | `0.7` |
| `PORT` | Server port | `5000` |
| `BACKEND_API_URL` | Node.js backend URL | `http://localhost:8000` |
| `LOG_LEVEL` | Logging level | `INFO` |

## Integration with Node.js Backend

This service communicates with the Node.js backend to:

1. **Fetch patient data**: Get patient profiles, medications, tasks
2. **Log conversations**: Store chat history in Supabase
3. **Create alerts**: Notify caregivers of concerns
4. **Get reminders**: Access today's tasks for context

The `backend_client.py` handles all HTTP communication with the backend.

## Startup Sequence

For the full system to work, start services in this order:

```bash
# Terminal 1: Start Backend (required first)
cd backend
npm run dev
# Wait for: "Server running on http://localhost:8000"

# Terminal 2: Start Python ADK
cd google-adk/google_adk/google-adk
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn api.main:app --reload --port 5000
# Wait for: "Application startup complete"

# Terminal 3: Start Frontend (optional for testing)
cd frontend
npm run dev
# Visit: http://localhost:3000
```

## Troubleshooting

### "Cannot connect to backend"
- Ensure Node.js backend is running on port 8000
- Check `BACKEND_API_URL` in `.env`

### "GOOGLE_API_KEY not set"
- Add your Gemini API key to `.env`
- Get a key from https://makersuite.google.com/app/apikey

### "Module not found" errors
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt`

### Import errors for agents
- Run the server from the `google-adk` directory
- Ensure you're in the correct folder: `google-adk/google_adk/google-adk/`

## License

MIT License

## Team

Built with care for Alzheimer's patients and their caregivers
