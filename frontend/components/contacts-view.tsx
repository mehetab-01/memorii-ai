'use client';

import { useState } from 'react';
import { Plus, Search, Heart, Stethoscope, Building2, Phone, Mail, MapPin } from 'lucide-react';

type ContactCategory = 'all' | 'family' | 'doctor' | 'pharmacy' | 'emergency';

interface Contact {
  id: number;
  name: string;
  role: string;
  category: 'family' | 'doctor' | 'pharmacy' | 'emergency';
  isPrimary?: boolean;
  phone: string;
  email: string;
  address?: string;
  initials: string;
  initialsColor: string;
}

export default function ContactsView() {
  const [activeFilter, setActiveFilter] = useState<ContactCategory>('all');

  const contacts: Contact[] = [
    {
      id: 1,
      name: 'Dr. Sarah Harris',
      role: 'Neurologist',
      category: 'doctor',
      isPrimary: true,
      phone: '+1 (555) 111-2222',
      email: 'dr.harris@medical.com',
      address: '123 Medical Center Dr, Suite 4...',
      initials: 'DS',
      initialsColor: 'bg-blue-100 text-blue-600'
    },
    {
      id: 2,
      name: 'Emily Johnson',
      role: "Mary's Daughter",
      category: 'family',
      isPrimary: true,
      phone: '+1 (555) 333-4444',
      email: 'emily.j@email.com',
      initials: 'EJ',
      initialsColor: 'bg-pink-100 text-pink-600'
    },
    {
      id: 3,
      name: 'David Lee',
      role: "Robert's Son",
      category: 'family',
      phone: '+1 (555) 555-6666',
      email: 'david.lee@email.com',
      initials: 'DL',
      initialsColor: 'bg-pink-100 text-pink-600'
    },
    {
      id: 4,
      name: 'CVS Pharmacy',
      role: 'Pharmacy',
      category: 'pharmacy',
      phone: '+1 (555) 777-8888',
      email: 'pharmacy@cvs.com',
      address: '456 Main Street',
      initials: 'CP',
      initialsColor: 'bg-green-100 text-green-600'
    },
    {
      id: 5,
      name: 'Emergency Services',
      role: 'Emergency',
      category: 'emergency',
      phone: '911',
      email: '',
      initials: 'ES',
      initialsColor: 'bg-red-100 text-red-600'
    },
    {
      id: 6,
      name: 'Dr. Michael Chen',
      role: 'General Practitioner',
      category: 'doctor',
      phone: '+1 (555) 999-0000',
      email: 'dr.chen@medical.com',
      address: '789 Health Ave',
      initials: 'DM',
      initialsColor: 'bg-blue-100 text-blue-600'
    }
  ];

  const filteredContacts = activeFilter === 'all' 
    ? contacts 
    : contacts.filter(c => c.category === activeFilter);

  const getCategoryBadge = (category: string, isPrimary?: boolean) => {
    const badges = {
      doctor: { label: 'Doctor', color: 'bg-blue-50 text-blue-600', icon: <Stethoscope size={14} /> },
      family: { label: 'Family', color: 'bg-pink-50 text-pink-600', icon: <Heart size={14} /> },
      pharmacy: { label: 'Pharmacy', color: 'bg-green-50 text-green-600', icon: <Building2 size={14} /> },
      emergency: { label: 'Emergency', color: 'bg-red-50 text-red-600', icon: <Phone size={14} /> }
    };
    
    const badge = badges[category as keyof typeof badges];
    
    return (
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
          {badge.icon}
          {badge.label}
        </span>
        {isPrimary && (
          <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-sm font-medium">
            Primary
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contacts</h1>
          <p className="text-gray-600">Manage emergency contacts, doctors, and family members</p>
        </div>
        <button className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold">
          <Plus size={20} />
          Add Contact
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search contacts..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-5 py-3 rounded-lg font-medium transition-colors ${
              activeFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveFilter('family')}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-colors ${
              activeFilter === 'family'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Heart size={18} />
            Family
          </button>
          <button
            onClick={() => setActiveFilter('doctor')}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-colors ${
              activeFilter === 'doctor'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Stethoscope size={18} />
            Doctor
          </button>
          <button
            onClick={() => setActiveFilter('pharmacy')}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-colors ${
              activeFilter === 'pharmacy'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Building2 size={18} />
            Pharmacy
          </button>
          <button
            onClick={() => setActiveFilter('emergency')}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-colors ${
              activeFilter === 'emergency'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Phone size={18} />
            Emergency
          </button>
        </div>
      </div>

      {/* Contact Cards Grid */}
      <div className="grid grid-cols-3 gap-6">
        {filteredContacts.map((contact) => (
          <div key={contact.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${contact.initialsColor}`}>
                {contact.initials}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{contact.name}</h3>
                <p className="text-gray-500 text-sm">{contact.role}</p>
              </div>
            </div>

            <div className="mb-4">
              {getCategoryBadge(contact.category, contact.isPrimary)}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Phone size={16} className="text-gray-400" />
                {contact.phone}
              </div>
              {contact.email && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Mail size={16} className="text-gray-400" />
                  {contact.email}
                </div>
              )}
              {contact.address && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <MapPin size={16} className="text-gray-400" />
                  {contact.address}
                </div>
              )}
            </div>

            {contact.category === 'emergency' && contact.phone === '911' && (
              <p className="text-gray-500 text-xs mb-4">For life-threatening emergencies only</p>
            )}

            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <Phone size={16} />
                Call
              </button>
              {contact.email && (
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                  <Mail size={16} />
                  Email
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
