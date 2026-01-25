'use client';

import { useState, useEffect } from 'react';
import { Bell, Calendar, CheckCircle, AlertTriangle, AlertCircle, Clock, Plus, MessageCircle } from 'lucide-react';
import { dashboardApi, reminderApi, patientApi, type Patient, type Reminder } from '@/lib/api';
import CreateTaskModal from './CreateTaskModal';
import CreateReminderModal from './CreateReminderModal';
import AddNoteModal from './AddNoteModal';
import AIChatModal from './AIChatModal';

interface DashboardData {
  patients: Patient[];
  todaysTasks: Reminder[];
  recentNotes: { id: string; content: string; patient_id: string; timestamp: string }[];
  safetySummary: { safe: number; warning: number; danger: number };
}

export default function MaryDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showAIChatModal, setShowAIChatModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [overview, todayReminders] = await Promise.all([
        dashboardApi.getOverview(),
        reminderApi.getToday(),
      ]);
      
      setDashboardData(overview);
      setReminders(todayReminders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCompleteReminder = async (reminderId: string) => {
    try {
      await reminderApi.complete(reminderId);
      fetchDashboardData();
    } catch (err) {
      console.error('Error completing reminder:', err);
    }
  };

  const getSafetyIcon = (status: string) => {
    switch (status) {
      case 'safe':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'danger':
        return <AlertCircle className="text-red-500" size={16} />;
      default:
        return <CheckCircle className="text-green-500" size={16} />;
    }
  };

  // Filter tasks (reminder_type === 'task') and other reminders separately
  const tasks = reminders.filter(r => r.reminder_type === 'task');
  const otherReminders = reminders.filter(r => r.reminder_type !== 'task' && !r.completed);
  
  const completedTasks = tasks.filter(r => r.completed).length;
  const totalTasks = tasks.length;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Caregiver Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, Caregiver</p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Calendar className="w-6 h-6 text-gray-600" />
            </button>
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
              SS
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
              <button onClick={fetchDashboardData} className="ml-4 underline">Retry</button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading dashboard...</span>
            </div>
          )}

          {!loading && (
            <>
              {/* Top Row Cards */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                {/* Today's Tasks */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-gray-900">Today's Tasks</h2>
                      <span className="text-sm text-gray-400">{completedTasks}/{totalTasks}</span>
                    </div>
                    <button 
                      onClick={() => setShowTaskModal(true)}
                      className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Task
                    </button>
                  </div>
                  
                  {tasks.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-400">No tasks for today</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {tasks.map((task) => (
                        <div 
                          key={task.id} 
                          className={`flex items-center gap-3 p-3 rounded-lg ${task.completed ? 'bg-green-50' : 'bg-gray-50'}`}
                        >
                          <button 
                            onClick={() => handleCompleteReminder(task.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              task.completed 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : 'border-gray-300 hover:border-purple-400'
                            }`}
                          >
                            {task.completed && <CheckCircle size={12} />}
                          </button>
                          <span className={task.completed ? 'text-gray-400 line-through' : 'text-gray-700'}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reminders */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Reminders</h2>
                    <button 
                      onClick={() => setShowReminderModal(true)}
                      className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>
                  
                  {otherReminders.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-gray-400">No upcoming reminders</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {otherReminders.map((reminder) => (
                        <div key={reminder.id} className="p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-800">{reminder.title}</span>
                            <span className="text-xs text-purple-600 capitalize">{reminder.reminder_type}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Clock size={12} />
                            {new Date(reminder.due_date).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Patient Safety */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Patient Safety</h2>
                  </div>
                  
                  {!dashboardData?.patients || dashboardData.patients.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-gray-400">No patients to display</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">{dashboardData.safetySummary.safe} Safe</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">{dashboardData.safetySummary.warning} Warning</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">{dashboardData.safetySummary.danger} Danger</span>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {dashboardData.patients.slice(0, 5).map((patient) => (
                          <div key={patient.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                                {patient.name.charAt(0)}
                              </div>
                              <span className="text-sm font-medium text-gray-700">{patient.name}</span>
                            </div>
                            {getSafetyIcon(patient.safety_status)}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notes Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Notes</h2>
                  <div className="flex items-center gap-3">
                    <span className="bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full">
                      {dashboardData?.recentNotes?.length || 0} notes
                    </span>
                    <button 
                      onClick={() => setShowNoteModal(true)}
                      className="text-purple-600 text-sm font-medium hover:text-purple-700 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Note
                    </button>
                  </div>
                </div>
                
                {!dashboardData?.recentNotes || dashboardData.recentNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">No notes yet. Add your first note!</p>
                    <button 
                      onClick={() => setShowNoteModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Add Note
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {dashboardData.recentNotes.map((note) => (
                      <div key={note.id} className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-700 text-sm">{note.content}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(note.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateTaskModal
        open={showTaskModal}
        onOpenChange={setShowTaskModal}
        onSuccess={fetchDashboardData}
      />

      <CreateReminderModal
        open={showReminderModal}
        onOpenChange={setShowReminderModal}
        onSuccess={fetchDashboardData}
      />

      <AddNoteModal
        open={showNoteModal}
        onOpenChange={setShowNoteModal}
        onSuccess={fetchDashboardData}
      />

      <AIChatModal
        open={showAIChatModal}
        onOpenChange={setShowAIChatModal}
      />

      {/* Floating AI Assistant Button */}
      <button
        onClick={() => setShowAIChatModal(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all hover:scale-110 z-30 group"
        aria-label="Open AI Assistant"
      >
        <MessageCircle size={28} />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold animate-pulse">
          AI
        </span>
      </button>
    </div>
  );
}
