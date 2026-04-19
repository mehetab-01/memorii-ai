import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import WebSocket server
import SocketServer from './websocket/socketServer';

// Import routes
import patientRoutes from './routes/patients';
import reminderRoutes from './routes/reminders';
import dashboardRoutes from './routes/dashboard';
import noteRoutes from './routes/notes';
import medicationRoutes from './routes/medications';
import dailyRoutineRoutes from './routes/dailyRoutines';
import appointmentRoutes from './routes/appointments';
// Mobile app routes
import mobileRoutes from './routes/mobile';
// AI Integration routes
import aiRoutes from './routes/ai';
import conversationRoutes from './routes/conversations';
import alertRoutes from './routes/alerts';

const app: Express = express();
const httpServer = createServer(app); // Create HTTP server for WebSocket
const PORT = process.env.PORT || 8000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// CORS configuration - allow frontend and Python ADK service
const ADK_SERVICE_URL = process.env.ADK_SERVICE_URL || 'http://localhost:5000';
app.use(cors({
  origin: [FRONTEND_URL, ADK_SERVICE_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/patients', patientRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/daily-routines', dailyRoutineRoutes);
app.use('/api/appointments', appointmentRoutes);
// Mobile app routes (for patient app)
app.use('/api/patient', mobileRoutes);
// AI Integration routes
app.use('/api/ai', aiRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/alerts', alertRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Initialize WebSocket server
new SocketServer(httpServer);

// Start server (use httpServer instead of app for WebSocket support)
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏥 Memoral API Gateway                                      ║
║                                                               ║
║   Server running on: http://localhost:${PORT}                   ║
║   WebSocket: ENABLED ✓                                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                ║
║   Frontend URL: ${FRONTEND_URL}                       ║
║   ADK Service: ${ADK_SERVICE_URL}                       ║
║                                                               ║
║   Core Endpoints:                                             ║
║   • GET  /health                      - Health check          ║
║   • GET  /api/patients                - List all patients     ║
║   • GET  /api/patients/:id            - Get patient details   ║
║   • POST /api/patients                - Create patient        ║
║   • GET  /api/reminders               - List all reminders    ║
║   • POST /api/reminders               - Create reminder       ║
║   • GET  /api/dashboard/overview      - Dashboard overview    ║
║                                                               ║
║   AI Integration Endpoints:                                   ║
║   • POST /api/ai/chat                 - Chat with AI agents   ║
║   • POST /api/ai/analyze              - Analyze patient data  ║
║   • POST /api/ai/optimize-reminder    - Optimize reminder     ║
║   • GET  /api/ai/health               - AI service health     ║
║   • GET  /api/conversations/patient/:id - Get conversations   ║
║   • POST /api/conversations           - Log conversation      ║
║   • GET  /api/alerts                  - Get all alerts        ║
║   • POST /api/alerts                  - Create alert          ║
║   • PUT  /api/alerts/:id/acknowledge  - Acknowledge alert     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
