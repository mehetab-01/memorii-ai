'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Grid, List, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { patientApi, type Patient } from '@/lib/api';
import AddPatientModal from './AddPatientModal';
import PatientDetailModal from './PatientDetailModal';

export default function PatientsView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await patientApi.getAll();
      setPatients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patients');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSafetyIcon = (status: string) => {
    switch (status) {
      case 'safe':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'danger':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return <CheckCircle className="text-green-500" size={20} />;
    }
  };

  const getSafetyBadge = (status: string) => {
    const colors = {
      safe: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      danger: 'bg-red-100 text-red-700',
    };
    return colors[status as keyof typeof colors] || colors.safe;
  };

  return (
    <div className="p-8 h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-600 mt-1">Manage and monitor your patients</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
        >
          <Plus size={20} />
          Add Patient
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400 transition-colors"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter size={20} className="text-gray-600" />
          <span className="text-gray-700 font-medium">Filters</span>
        </button>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          <button 
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Grid size={20} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Patient Count */}
      <p className="text-gray-600 mb-8">Showing {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}</p>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button onClick={fetchPatients} className="ml-4 underline">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading patients...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPatients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-gray-500 text-lg mb-6">
            {searchQuery ? 'No patients found matching your search' : 'No patients yet'}
          </p>
          {searchQuery ? (
            <button 
              onClick={() => setSearchQuery('')}
              className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Clear search
            </button>
          ) : (
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add your first patient
            </button>
          )}
        </div>
      )}

      {/* Patient Grid */}
      {!loading && filteredPatients.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <div 
              key={patient.id} 
              onClick={() => setSelectedPatient(patient)}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-lg">
                    {patient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                    <p className="text-sm text-gray-500">Age: {patient.age}</p>
                  </div>
                </div>
                {getSafetyIcon(patient.safety_status)}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Diagnosis:</span> {patient.diagnosis}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Location:</span> {patient.location}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getSafetyBadge(patient.safety_status)}`}>
                    {patient.safety_status.charAt(0).toUpperCase() + patient.safety_status.slice(1)}
                  </span>
                  {patient.medications && patient.medications.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {patient.medications.length} medication{patient.medications.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Patient List */}
      {!loading && filteredPatients.length > 0 && viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Age</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Diagnosis</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.map((patient) => (
                <tr 
                  key={patient.id} 
                  onClick={() => setSelectedPatient(patient)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-sm">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{patient.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{patient.age}</td>
                  <td className="py-3 px-4 text-gray-600">{patient.diagnosis}</td>
                  <td className="py-3 px-4 text-gray-600">{patient.location}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${getSafetyBadge(patient.safety_status)}`}>
                      {patient.safety_status.charAt(0).toUpperCase() + patient.safety_status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Patient Modal */}
      <AddPatientModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          fetchPatients();
        }}
      />

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          open={!!selectedPatient}
          onOpenChange={(open) => !open && setSelectedPatient(null)}
          onUpdate={() => {
            fetchPatients();
          }}
        />
      )}
    </div>
  );
}
