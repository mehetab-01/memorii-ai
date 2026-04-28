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
              `📝 **Title:** ${extractedData.title || 'Not specified'}\n` +
              `👤 **Patient:** ${matchingPatient?.name || extractedData.patientName || 'Please select a patient'}\n` +
              `🕐 **Time:** ${extractedData.time || 'Not specified'}\n` +
              `📅 **Date:** ${extractedData.date || 'Today'}\n\n` +
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
          text: `❌ Could not find a patient matching "${pendingData.patientName}". Please specify a valid patient name or create the reminder manually.`,
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
      
      // Determine reminder type — task for activities, medication, appointment, etc.
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
        text: `✅ **Task Added to ${matchingPatient.name}'s Plan!**\n\n` +
              `📋 ${pendingData.title}\n` +
              `🕒 Scheduled for ${pendingData.time || 'today'}\n\n` +
              `📱 **${matchingPatient.name}'s app has been notified** — the task will appear in their "Today's Schedule" section immediately.`,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMsg]);
      setPendingData(null);
    } catch (error) {
      console.error('Error creating reminder:', error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        text: `❌ Failed to create the ${pendingData.type}. Please try again or create it manually.`,
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
    "Create a reminder for John to take medication at 3pm",
    "Add a task for John to walk at 10am",
    "Show me today's tasks",
    "What medications are due?",
    "Give me a status update",
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
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-purple-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {message.inputType === 'voice' && ' 🎤'}
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
              {isListening ? '🎤 Listening... Speak now' : 'Press Enter to send, click mic for voice input'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
