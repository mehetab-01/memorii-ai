'use client';

import { Settings, LogOut, MoreVertical, BookMarked, Plus, Mail } from 'lucide-react';

interface SidebarProps {
  activeTab: 'dashboard' | 'patients' | 'contacts';
  setActiveTab: (tab: 'dashboard' | 'patients' | 'contacts') => void;
  onQuickCreate?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, onQuickCreate }: SidebarProps) {
  return (
    <div className="w-80 bg-gradient-to-b from-gray-50 to-white rounded-3xl m-4 shadow-xl flex flex-col overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
            <BookMarked size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Memorii</h1>
        </div>
        
        {/* Quick Create Button */}
        <button 
          onClick={onQuickCreate}
          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full px-4 py-3 font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-shadow"
        >
          <Plus size={18} />
          <span>Quick Create</span>
        </button>

        {/* Bookmark Icon */}
        </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        <NavItem 
          icon="🏠" 
          label="Dashboard" 
          isActive={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
        />
        <NavItem 
          icon="👤" 
          label="Patient" 
          isActive={activeTab === 'patients'}
          onClick={() => setActiveTab('patients')}
        />
        <NavItem 
          icon="👥" 
          label="Contacts" 
          isActive={activeTab === 'contacts'}
          onClick={() => setActiveTab('contacts')}
        />
      </nav>

      {/* Bottom Menu Items */}
      <div className="px-4 py-4 space-y-1 border-t border-gray-100">
        <NavItem 
          icon="⚙️" 
          label="Settings" 
          isActive={false}
          onClick={() => {}}
        />
        <NavItem 
          icon="❓" 
          label="Get Help" 
          isActive={false}
          onClick={() => {}}
        />
        <NavItem 
          icon="🔍" 
          label="Search" 
          isActive={false}
          onClick={() => {}}
        />
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-700 text-sm">
              SS
            </div>
            <div className="text-sm">
              <p className="font-semibold text-gray-900">soham sawant</p>
              <p className="text-gray-500 text-xs">soham@gmail.com</p>
            </div>
          </div>
          <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical size={16} className="text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ 
  icon, 
  label, 
  isActive, 
  onClick 
}: { 
  icon: string; 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
        isActive
          ? 'bg-purple-500 text-white shadow-md'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
