'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Mic, MicOff, Loader2, Plus, Clock, Pill, Calendar, CheckCircle } from 'lucide-react';
import { aiApi, ChatMessage, reminderApi, patientApi, type Patient } from '@/lib/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  inputType?: 'text' | 'voice';
  extractedData?: ExtractedData | null;
  locationCard?: LocationCardData | null;
}

interface LocationCardData {
  patientName: string;
  lat: number;
  lng: number;
  address: string;
  safetyStatus: string;
  diagnosis: string;
  isOnline: boolean;
  lastUpdated: string | null;
}

interface ExtractedData {
  type: 'reminder' | 'task' | 'medication' | 'appointment' | null;
  title?: string;
  patientName?: string;
  time?: string;
  date?: string;
  description?: string;
}

interface AIChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Parse voice/text input to extract structured data
function parseVoiceInput(text: string): ExtractedData | null {
  const lowerText = text.toLowerCase();
  
  // Check for reminder/task creation intent
  const isCreation = lowerText.includes('create') || lowerText.includes('add') || 
                     lowerText.includes('set') || lowerText.includes('remind') ||
                     lowerText.includes('schedule');
  
  if (!isCreation) return null;
  
  let type: ExtractedData['type'] = null;
  
  if (lowerText.includes('medication') || lowerText.includes('medicine') || lowerText.includes('pill') || lowerText.includes('drug')) {
    type = 'medication';
  } else if (lowerText.includes('appointment') || lowerText.includes('doctor') || lowerText.includes('visit')) {
    type = 'appointment';
  } else if (lowerText.includes('task') || lowerText.includes('walk') || lowerText.includes('exercise') || lowerText.includes('activity') || lowerText.includes('gym') || lowerText.includes('eat') || lowerText.includes('drink') || lowerText.includes('water')) {
    type = 'task';
  } else if (lowerText.includes('reminder')) {
    type = 'reminder';
  }
  
  if (!type) type = 'reminder'; // Default to reminder
  
  // Extract patient name (look for "for [Name]" pattern)
  let patientName: string | undefined;
  const forMatch = text.match(/for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (forMatch) {
    patientName = forMatch[1];
  }
  
  // Extract time (look for patterns like "at 3pm", "at 15:00", "at 3:30 PM")
  let time: string | undefined;
  const timeMatch = text.match(/at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (timeMatch) {
    let timeStr = timeMatch[1].toLowerCase();
    // Convert to 24h format
    const pmMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*pm/i);
    const amMatch = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*am/i);
    
    if (pmMatch) {
      let hours = parseInt(pmMatch[1]);
      if (hours !== 12) hours += 12;
      time = `${hours.toString().padStart(2, '0')}:${pmMatch[2] || '00'}`;
    } else if (amMatch) {
      let hours = parseInt(amMatch[1]);
      if (hours === 12) hours = 0;
      time = `${hours.toString().padStart(2, '0')}:${amMatch[2] || '00'}`;
    } else if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
      time = timeStr.padStart(5, '0');
    } else if (/^\d{1,2}$/.test(timeStr)) {
      time = `${timeStr.padStart(2, '0')}:00`;
    }
  }
  
  // Extract the main action/title
  let title: string | undefined;
  // Look for "to [action]" pattern
  const toMatch = text.match(/to\s+(take\s+[^,\.]+|do\s+[^,\.]+|check\s+[^,\.]+|have\s+[^,\.]+|[a-z]+\s+[a-z]+(?:\s+[a-z]+)?)/i);
  if (toMatch) {
    title = toMatch[1].replace(/\s+at\s+\d.*/i, '').trim();
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
  } else {
    // Try to get a meaningful title from the text
    const actionMatch = text.match(/(?:create|add|set|schedule)\s+(?:a\s+)?(?:reminder|task|appointment|medication)?\s*(?:for\s+\w+\s+)?(?:to\s+)?([^,\.]+)/i);
    if (actionMatch) {
      title = actionMatch[1].replace(/\s+at\s+\d.*/i, '').trim();
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
  }
  
  return {
    type,
    title,
    patientName,
    time,
    date: new Date().toISOString().split('T')[0], // Default to today
  };
}
// Detect status/location queries
function parseStatusQuery(text: string): string | null {
  const lower = text.toLowerCase();
  const isStatus = lower.includes(status update) || lower.includes(status of) || lower.includes(how is) || lower.includes(where is) || lower.includes(give me a status);
  if (!isStatus) return null;
  const patterns = [
    /(?:update for|status for|status of|location of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /(?:how is|where is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
  ];
  for (const p of patterns) { const m = text.match(p); if (m) return m[1].trim(); }
  return ";
}


// Map card rendered inside an AI chat bubble
function LocationCard({ data }: { data: LocationCardData }) {
  const mapsUrl = `https://www.google.com/maps?q=${data.lat},${data.lng}`;
  const safetyColors: Record<string, string> = {
    safe: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
  };
  const sc = safetyColors[data.safetyStatus] || safetyColors.safe;
  const emoji = data.safetyStatus === 'danger' ? '🚨' : data.safetyStatus === 'warning' ? '⚠️' : '✅';
  const ft = data.lastUpdated
    ? new Date(data.lastUpdated).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;
  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-md w-full max-w-sm">
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block group">
        <div className="w-full h-36 bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-100 flex flex-col items-center justify-center gap-2 group-hover:brightness-95 transition-all">
          <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#4F46E5"/>
            </svg>
          </div>
          <p className="text-sm font-bold text-indigo-700">{data.lat.toFixed(5)}, {data.lng.toFixed(5)}</p>
          <p className="text-xs text-indigo-400 group-hover:underline">📍 Click to open in Google Maps ↗</p>
        </div>
      </a>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-800 text-sm">{data.patientName}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${sc}`}>
            {emoji} {data.safetyStatus.charAt(0).toUpperCase() + data.safetyStatus.slice(1)}
          </span>
        </div>
        <p className="text-xs text-gray-500">{data.diagnosis}</p>
        <div className="text-xs text-gray-700 space-y-1">
          <p><span className="font-semibold">📍 Address:</span> {data.address}</p>
          <p><span className="font-semibold">🛰 Latitude:</span> {data.lat.toFixed(6)}</p>
          <p><span className="font-semibold">🛰 Longitude:</span> {data.lng.toFixed(6)}</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className={`text-xs font-medium ${data.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
            {data.isOnline ? '🟢 Device Online' : '⚫ Device Offline'}
          </span>
          {ft && <span className="text-xs text-gray-400">{ft}</span>}
        </div>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="block w-full text-center py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors">
          🗺 Open in Google Maps
        </a>
      </div>
    </div>
  );
}

export default function AIChatModal({ open, onOpenChange }: AIChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your AI assistant. I can help you create tasks, add notes, check on patients, and more. Try saying something like 'Give me a status update' or 'Add a task for John to walk at 10am'.",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pendingData, setPendingData] = useState<ExtractedData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Fetch patients on open
  useEffect(() => {
    if (open) {
      patientApi.getAll().then(setPatients).catch(console.error);
    }
  }, [open]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Provide user-friendly error messages
        const errorMessages: Record<string, string> = {
          'network': 'Network error. Please check your internet connection and try again.',
          'not-allowed': 'Microphone access denied. Please allow microphone permissions in your browser.',
          'no-speech': 'No speech detected. Please try speaking again.',
          'audio-capture': 'No microphone found. Please connect a microphone and try again.',
          'aborted': 'Speech recognition was cancelled.',
          'service-not-allowed': 'Speech recognition service is not available. Please try again later.',
        };
        
        const userMessage = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
        if (event.error !== 'aborted') {
          alert(userMessage);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoiceInput = async () => {
    // Check if we're on a secure context (HTTPS or localhost)
    const isSecureContext = window.isSecureContext;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!isSecureContext && !isLocalhost) {
      alert(`Speech recognition requires HTTPS or localhost.\n\nCurrent URL: ${window.location.origin}\n\nPlease access the app via http://localhost:3000 instead.`);
      return;
    }

    if (!recognitionRef.current) {
      // Try the standard API as fallback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
        return;
      }
    }

    // Request microphone permission explicitly first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      alert('Microphone permission denied. Please allow microphone access in your browser settings.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // Try to parse voice input for structured data
    const extractedData = parseVoiceInput(inputText);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      inputType: isListening ? 'voice' : 'text',
      extractedData,
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageToSend = inputText;
    setInputText('');
    setIsLoading(true);


    // ── Status / location update query ──────────────────────────────────────
    const statusPatientName = parseStatusQuery(messageToSend);
    if (statusPatientName !== null) {
      // Find matching patient
      const target = statusPatientName
        ? patients.find(p => p.name.toLowerCase().includes(statusPatientName.toLowerCase()))
        : patients[0];

      if (!target) {
        const notFound: Message = {
          id: (Date.now() + 1).toString(),
          text: statusPatientName
            ? `❌ No patient found matching "${statusPatientName}". Please check the name and try again.`
            : '❌ No patients found in the system.',
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, notFound]);
        setIsLoading(false);
        return;
      }

      // Fetch fresh patient data (includes last_location from GPS updates)
      try {
        const fresh = await patientApi.getById(target.id);
        const loc = fresh.last_location as { latitude: number; longitude: number } | null | undefined;
        const hasGPS = loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number';

        const cardData: LocationCardData | null = hasGPS ? {
          patientName: fresh.name,
          lat: loc!.latitude,
          lng: loc!.longitude,
          address: fresh.location || 'Address not available',
          safetyStatus: fresh.safety_status,
          diagnosis: fresh.diagnosis,
          isOnline: false, // will be updated by online map if needed
          lastUpdated: fresh.last_location_update || null,
        } : null;

        const statusText = hasGPS
          ? `📊 **Status Update — ${fresh.name}**\n\nHere is the current location and status for ${fresh.name}. Click the map below to open Google Maps.`
          : `📊 **Status Update — ${fresh.name}**\n\n⚠️ No GPS location data available yet. The patient's device may be offline or location sharing has not been enabled.\n\n• **Safety Status:** ${fresh.safety_status.charAt(0).toUpperCase() + fresh.safety_status.slice(1)}\n• **Diagnosis:** ${fresh.diagnosis}\n• **Address:** ${fresh.location || 'Unknown'}`;

        const statusMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: statusText,
          sender: 'ai',
          timestamp: new Date(),
          locationCard: cardData,
        };
        setMessages(prev => [...prev, statusMsg]);
      } catch {
        const errMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: `❌ Failed to fetch location data for ${target.name}. Please check the backend connection.`,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errMsg]);
      }
      setIsLoading(false);
      return;
    }

    // If we extracted creation data, show confirmation
    if (extractedData && extractedData.type) {
      setPendingData(extractedData);
      
      // Find matching patient
      const matchingPatient = patients.find(
        p => p.name.toLowerCase().includes(extractedData.patientName?.toLowerCase() || '')
      );
      
      const confirmMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `I understood you want to create a ${extractedData.type}:\n\n` +
              `ðŸ“ **Title:** ${extractedData.title || 'Not specified'}\n` +
              `ðŸ‘¤ **Patient:** ${matchingPatient?.name || extractedData.patientName || 'Please select a patient'}\n` +
              `ðŸ• **Time:** ${extractedData.time || 'Not specified'}\n` +
              `ðŸ“… **Date:** ${extractedData.date || 'Today'}\n\n` +
              `Would you like me to create this? Click the button below to confirm.`,
        sender: 'ai',
        timestamp: new Date(),
        extractedData,
      };
      
      setMessages((prev) => [...prev, confirmMessage]);
      setIsLoading(false);
      return;
    }

    try {
      // Build conversation history for AI context
      const conversationHistory: ChatMessage[] = messages.map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
        timestamp: msg.timestamp.toISOString(),
      }));

      // Call the backend AI endpoint
      const response = await aiApi.chat({
        message: messageToSend,
        conversationHistory,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting to the AI service right now. Please make sure the backend server is running on port 8000 and the Python ADK service is running on port 5000.",
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle creating the reminder/task from extracted data
  const handleCreateFromExtracted = async () => {
    if (!pendingData) return;
    
    setIsCreating(true);
    
    try {
      // Find matching patient
      const matchingPatient = patients.find(
        p => p.name.toLowerCase().includes(pendingData.patientName?.toLowerCase() || '')
      );
      
      if (!matchingPatient) {
        const errorMsg: Message = {
          id: Date.now().toString(),
          text: `âŒ Could not find a patient matching "${pendingData.patientName}". Please specify a valid patient name or create the reminder manually.`,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setPendingData(null);
        setIsCreating(false);
        return;
      }
      
      // Create the due date
      const dueDate = `${pendingData.date || new Date().toISOString().split('T')[0]}T${pendingData.time || '12:00'}:00`;
      
      // Determine reminder type â€” task for activities, medication, appointment, etc.
      const reminderType: 'medication' | 'appointment' | 'task' | 'supplies' =
        pendingData.type === 'medication' ? 'medication' :
        pendingData.type === 'appointment' ? 'appointment' : 'task';

      // Create the reminder (backend will emit task:added socket event to patient app)
      await reminderApi.create({
        patient_id: matchingPatient.id,
        title: pendingData.title || 'New Task',
        description: `Added by caretaker via AI assistant`,
        reminder_type: reminderType,
        due_date: dueDate,
      });
      
      const successMsg: Message = {
        id: Date.now().toString(),
        text: `âœ… **Task Added to ${matchingPatient.name}'s Plan!**\n\n` +
              `ðŸ“‹ ${pendingData.title}\n` +
              `ðŸ•’ Scheduled for ${pendingData.time || 'today'}\n\n` +
              `ðŸ“± **${matchingPatient.name}'s app has been notified** â€” the task will appear in their "Today's Schedule" section immediately.`,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMsg]);
      setPendingData(null);
    } catch (error) {
      console.error('Error creating reminder:', error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        text: `âŒ Failed to create the ${pendingData.type}. Please try again or create it manually.`,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedPrompts = [
    "Give me a status update for John Anderson",
    "Where is John right now?",
    "Create a reminder for John to take medication at 3pm",
    "Add a task for John to walk at 10am",
    "What medications are due?",
  ];

  const handleSuggestedPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={() => onOpenChange(false)}
      />

      {/* Chat Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Assistant</h2>
              <p className="text-sm text-gray-500 mt-1">Ask me anything or give me a command</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  {message.locationCard && <LocationCard data={message.locationCard} />}
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-purple-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {message.inputType === 'voice' && ' ðŸŽ¤'}
                  </p>
                </div>
              </div>
            ))}

            {/* Show confirm button when there's pending data */}
            {pendingData && (
              <div className="flex justify-start">
                <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle size={20} />
                    <span className="font-medium">Ready to create</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateFromExtracted}
                      disabled={isCreating}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isCreating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      {isCreating ? 'Creating...' : 'Create Now'}
                    </button>
                    <button
                      onClick={() => setPendingData(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          {messages.length === 1 && (
            <div className="px-6 pb-4">
              <p className="text-xs text-gray-500 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedPrompt(prompt)}
                    className="text-xs px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-6 border-t border-gray-200">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message or use voice..."
                  rows={2}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 transition-colors"
                />
              </div>

              <button
                onClick={toggleVoiceInput}
                disabled={isLoading}
                className={`p-3 rounded-xl transition-all ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading}
                className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={24} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {isListening ? 'ðŸŽ¤ Listening... Speak now' : 'Press Enter to send, click mic for voice input'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

