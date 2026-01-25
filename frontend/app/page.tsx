'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import Sidebar from '@/components/sidebar';
import MaryDashboard from '@/components/mary-dashboard';
import PatientsView from '@/components/patients-view';
import ContactsView from '@/components/contacts-view';
import SignInModal from '@/components/SignInModal';
import SignUpModal from '@/components/SignUpModal';
import SuccessModal from '@/components/SuccessModal';
import AddPatientModal from '@/components/AddPatientModal';
import CreateReminderModal from '@/components/CreateReminderModal';
import AddNoteModal from '@/components/AddNoteModal';
import CreateTaskModal from '@/components/CreateTaskModal';
import AIChatModal from '@/components/AIChatModal';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'contacts'>('dashboard');
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  
  // Quick Create modals state
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showCreateReminder, setShowCreateReminder] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const handleSignInSuccess = () => {
    setShowSignIn(false);
    setIsLoggedIn(true);
  };

  const handleSignUpSuccess = () => {
    setShowSignUp(false);
    setShowSuccess(true);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setShowSignIn(true);
  };

  // Landing Page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100 flex items-center justify-center p-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo/Title */}
          <div className="mb-8">
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
              MEMORII
            </h1>
            <p className="text-xl text-gray-600">
              Your Personal Health Companion for Memory Care
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="text-4xl mb-3">🧠</div>
              <h3 className="font-semibold text-gray-800 mb-2">Memory Support</h3>
              <p className="text-sm text-gray-600">Track daily activities and important reminders</p>
            </div>
            <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="text-4xl mb-3">❤️</div>
              <h3 className="font-semibold text-gray-800 mb-2">Health Monitoring</h3>
              <p className="text-sm text-gray-600">Keep track of health notes and vitals</p>
            </div>
            <div className="bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="text-4xl mb-3">👥</div>
              <h3 className="font-semibold text-gray-800 mb-2">Caregiver Support</h3>
              <p className="text-sm text-gray-600">Connect with caregivers and loved ones</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => setShowSignIn(true)}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              Sign In
            </button>
            <button
              onClick={() => setShowSignUp(true)}
              className="px-8 py-4 bg-white text-gray-700 font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 border-2 border-blue-200"
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Modals */}
        {showSignIn && (
          <SignInModal onClose={() => setShowSignIn(false)} onSuccess={handleSignInSuccess} />
        )}
        {showSignUp && (
          <SignUpModal onClose={() => setShowSignUp(false)} onSuccess={handleSignUpSuccess} />
        )}
        {showSuccess && (
          <SuccessModal onClose={handleSuccessClose} />
        )}
      </div>
    );
  }

  // Dashboard (after login)
  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onQuickCreate={() => setShowQuickCreate(true)}
      />
      <main className="flex-1 overflow-hidden">
        {activeTab === 'dashboard' && <MaryDashboard />}
        {activeTab === 'patients' && <PatientsView />}
        {activeTab === 'contacts' && <ContactsView />}
      </main>

      {/* Quick Create Modal */}
      {showQuickCreate && (
        <AIChatModal
          open={showQuickCreate}
          onOpenChange={setShowQuickCreate}
        />
      )}

      {/* Creation Modals */}
      <AddPatientModal
        open={showAddPatient}
        onOpenChange={setShowAddPatient}
        onSuccess={() => {
          // Optionally refresh data or show success message
        }}
      />
      
      <CreateReminderModal
        open={showCreateReminder}
        onOpenChange={setShowCreateReminder}
        onSuccess={() => {
          // Optionally refresh data or show success message
        }}
      />
      
      <AddNoteModal
        open={showAddNote}
        onOpenChange={setShowAddNote}
        onSuccess={() => {
          // Optionally refresh data or show success message
        }}
      />
      
      <CreateTaskModal
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        onSuccess={() => {
          // Optionally refresh data or show success message
        }}
      />
    </div>
  );
}
