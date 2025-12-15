'use client';
import React, { useState, useEffect } from 'react';
import { User, Users, FileText, UserPlus, CheckCircle, AlertCircle, Clock, Search } from 'lucide-react';
import jwt_decode from 'jwt-decode';

// API Service
class APIService {
  constructor() {
    this.baseURL = 'http://localhost:5000';
  }

  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
        mode: 'cors',
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Backend returned ${contentType || 'non-JSON'} response. Is your backend running at ${this.baseURL}?`);
      }

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) throw new Error('Invalid or missing token - Please log in again');
        throw new Error(data.message || 'Request failed');
      }
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  getAllEmployees() { return this.request('/employee-profile'); }
  getEmployee(id) { return this.request(`/employee-profile/${id}`); }
  getMyProfile(employeeNumber) { return this.request(`/employee-profile/${employeeNumber}/my-profile`); }
  updateSelfImmediate(employeeNumber, data) { return this.request(`/employee-profile/${employeeNumber}/my-profile/immediate`, { method: 'PUT', body: JSON.stringify(data) }); }
  createEmployee(data) { return this.request('/employee-profile', { method: 'POST', body: JSON.stringify(data) }); }
  updateEmployeeAdmin(id, data) { return this.request(`/employee-profile/${id}/admin`, { method: 'PUT', body: JSON.stringify(data) }); }
  getMyEmployees() { return this.request('/employee-profile/my-employees'); }
  createChangeRequest(employeeNumber, data) { return this.request(`/employee-profile/${employeeNumber}/my-profile/change-request`, { method: 'POST', body: JSON.stringify(data) }); }
  getAllChangeRequests() { return this.request('/employee-profile/change-requests/all'); }
  reviewChangeRequest(requestId, data) { return this.request(`/employee-profile/change-request/${requestId}/review`, { method: 'POST', body: JSON.stringify(data) }); }
  createCandidate(data) { return this.request('/employee-profile/candidate', { method: 'POST', body: JSON.stringify(data) }); }
  getByRole(role) { return this.request(`/employee-profile/roles?role=${role}`); }
  getMyRole() { return this.request('/employee-profile/myrole', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); }
}

const api = new APIService();

const EmployeeProfileDashboard = () => {
  const [activeView, setActiveView] = useState('overview');
  const [employees, setEmployees] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roles, setRoles] = useState([]);
  const [role, setRole] = useState('');

  const [currentUser] = useState({ employeeNumber: 'EMP-1001', roles: ['HR_MANAGER'], primaryDepartmentId: '507f1f77bcf86cd799439011' });

  const [candidateForm, setCandidateForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [employeeForm, setEmployeeForm] = useState({ firstName: '', lastName: '', email: '', phone: '', position: '' });
  const [changeRequestForm, setChangeRequestForm] = useState({ requestDescription: '', reason: '' });
  const [selfUpdateForm, setSelfUpdateForm] = useState({ profilePictureUrl: '', biography: '', personalEmail: '', mobilePhone: '', address: { city: '', streetAddress: '', country: '' } });

  const hasRole = (r) => roles.includes(r);
  const isHR = hasRole('HR Manager') || hasRole('HR Employee');
  const isDeptHead = hasRole('department head');
  const isDeptEmployee = hasRole('department employee');

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await api.getMyRole();
        setRoles(data.roles || [data.role]);
        setRole(data.role);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch roles');
      }
    };
    fetchRoles();
    fetchMyProfile();
    loadEmployees();
  }, []);

  // Fetch change requests
useEffect(() => {
  if (activeView === 'change-requests') {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const data = await api.getAllChangeRequests();
        console.log('Change Requests fetched:', data); // log for debugging
        setChangeRequests(data);
      } catch (err) {
        console.error('Failed to fetch change requests:', err);
        setError(err.message || 'Failed to fetch change requests');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }
}, [activeView]);

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllEmployees();
      setEmployees(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  // const fetchChangeRequests = async () => {
  //   setLoading(true);
  //   try {
  //     // setChangeRequests([
  //     //   { requestId: 'REQ-1', employeeProfileId: { firstName: 'John', lastName: 'Doe' }, requestDescription: 'Update address', status: 'PENDING', submittedAt: new Date() },
  //     //   { requestId: 'REQ-2', employeeProfileId: { firstName: 'Jane', lastName: 'Smith' }, requestDescription: 'Change email', status: 'APPROVED', submittedAt: new Date() }
  //     // ]);
  //     const res = await fetch('/api/employee-profile/change-requests/all');
  //     const data = await res.json();
  //     setChangeRequests(data);
      
  //   } catch (err) {
  //     setError('Failed to fetch change requests');
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const fetchChangeRequests = async () => {
  setLoading(true);
  try {
    const data = await api.getAllChangeRequests();
    console.log(data);
    setChangeRequests(data);
  } catch (err) {
    setError(err.message || 'Failed to fetch change requests');
  } finally {
    setLoading(false);
  }
};


  const fetchMyProfile = async () => {
    try {
      const data = await api.getMyProfile(currentUser.employeeNumber);
      setMyProfile(data);
    } catch (err) {
      setError('Failed to fetch profile');
    }
  };

  // Form handlers
  const createEmployee = async (e) => { e.preventDefault(); try { setSuccess('Employee created successfully'); setEmployeeForm({ firstName: '', lastName: '', email: '', phone: '', position: '' }); fetchEmployees(); } catch { setError('Failed to create employee'); } };
  const createCandidate = async (e) => { e.preventDefault(); try { setSuccess('Candidate created successfully'); setCandidateForm({ firstName: '', lastName: '', email: '', phone: '' }); } catch { setError('Failed to create candidate'); } };
  const updateSelfProfile = async (e) => { e.preventDefault(); try { setSuccess('Profile updated successfully'); fetchMyProfile(); } catch { setError('Failed to update profile'); } };
  const submitChangeRequest = async (e) => { e.preventDefault(); try { setSuccess('Change request submitted'); setChangeRequestForm({ requestDescription: '', reason: '' }); } catch { setError('Failed to submit change request'); } };
  //const reviewChangeRequest = async (requestId, approve) => { try { setSuccess(`Change request ${approve ? 'approved' : 'rejected'}`); fetchChangeRequests(); } catch { setError('Failed to review change request'); } };
const reviewChangeRequest = async (requestId, approve) => {
  try {
    await api.reviewChangeRequest(requestId, { approved: approve });
    setSuccess(`Change request ${approve ? 'approved' : 'rejected'}`);
    
    // Refetch change requests after review
    const updatedRequests = await api.getAllChangeRequests();
    console.log('Updated Change Requests:', updatedRequests);
    setChangeRequests(updatedRequests);
  } catch (err) {
    console.error('Failed to review change request:', err);
    setError(err.message || 'Failed to review change request');
  }
};
  const filteredEmployees = employees.filter(emp =>
    emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatusBadge = ({ status }) => {
    const styles = { PENDING: 'badge-pending', APPROVED: 'badge-approved', REJECTED: 'badge-rejected' };
    return <span className={`badge ${styles[status]}`}>{status}</span>;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      <style>{`
        :root {
          --primary-50: #eff6ff;
          --primary-100: #dbeafe;
          --primary-200: #bfdbfe;
          --primary-300: #93c5fd;
          --primary-400: #60a5fa;
          --primary-500: #3b82f6;
          --primary-600: #2563eb;
          --primary-700: #1d4ed8;
          --primary-800: #1e40af;
          --primary-900: #1e3a8a;
          
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --gray-400: #9ca3af;
          --gray-500: #6b7280;
          --gray-600: #4b5563;
          --gray-700: #374151;
          --gray-800: #1f2937;
          --gray-900: #111827;
          
          --success: #10b981;
          --success-dark: #059669;
          --warning: #f59e0b;
          --warning-dark: #d97706;
          --error: #ef4444;
          --error-dark: #dc2626;
          
          --bg-primary: #ffffff;
          --bg-secondary: #f9fafb;
          --bg-dark: #1f2937;
          --bg-hover: #f3f4f6;
          
          --text-primary: #111827;
          --text-secondary: #4b5563;
          --text-tertiary: #6b7280;
          --text-inverse: #ffffff;
          
          --border-light: #e5e7eb;
          --border-medium: #d1d5db;
          --border-focus: #3b82f6;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
        
        .btn-primary {
          background-color: var(--primary-600);
          color: var(--text-inverse);
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-primary:hover { background-color: var(--primary-700); }
        
        .btn-secondary {
          background-color: var(--gray-100);
          color: var(--text-primary);
          border: 1px solid var(--border-medium);
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover { background-color: var(--gray-200); }
        
        .btn-success {
          background-color: var(--success);
          color: var(--text-inverse);
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
        }
        
        .btn-danger {
          background-color: var(--error);
          color: var(--text-inverse);
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
        }
        
        .card {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        .table {
          width: 100%;
          background-color: var(--bg-primary);
          border-collapse: collapse;
        }
        .table thead {
          background-color: var(--gray-50);
          border-bottom: 2px solid var(--border-medium);
        }
        .table th {
          color: var(--text-secondary);
          font-weight: 600;
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.875rem;
          text-transform: uppercase;
        }
        .table td {
          padding: 1rem;
          border-bottom: 1px solid var(--border-light);
          color: var(--text-primary);
        }
        .table tbody tr:hover { background-color: var(--bg-hover); }
        
        .form-group { margin-bottom: 1.25rem; }
        .form-label {
          display: block;
          color: var(--text-secondary);
          font-weight: 500;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        .form-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid var(--border-medium);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: var(--text-primary);
          background-color: var(--bg-primary);
          transition: border-color 0.2s ease;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--border-focus);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge-pending { background-color: #fef3c7; color: #92400e; }
        .badge-approved { background-color: #d1fae5; color: #065f46; }
        .badge-rejected { background-color: #fee2e2; color: #991b1b; }
        
        .navbar {
          background-color: var(--bg-primary);
          border-bottom: 1px solid var(--border-light);
          padding: 1rem 2rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        .sidebar {
          background-color: var(--bg-dark);
          color: var(--text-inverse);
          min-height: 100vh;
          padding: 1.5rem;
        }
        .sidebar-item {
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          color: var(--gray-300);
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .sidebar-item:hover {
          background-color: rgba(255, 255, 255, 0.1);
          color: var(--text-inverse);
        }
        .sidebar-item.active {
          background-color: var(--primary-600);
          color: var(--text-inverse);
        }
        
        .alert {
          padding: 1rem 1.25rem;
          border-radius: 0.5rem;
          border-left: 4px solid;
          margin-bottom: 1rem;
        }
        .alert-success {
          background-color: #d1fae5;
          border-color: var(--success);
          color: var(--success-dark);
        }
        .alert-error {
          background-color: #fee2e2;
          border-color: var(--error);
          color: var(--error-dark);
        }
        
        .modal-overlay {
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background-color: var(--bg-primary);
          border-radius: 0.75rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-width: 90vw;
        }
        
        .stat-card, .stat-card-warning, .stat-card-success {
          color: var(--text-inverse);
          padding: 1.5rem;
          border-radius: 0.75rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .stat-card {
          background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%);
        }
        .stat-card-success {
          background: linear-gradient(135deg, var(--success) 0%, var(--success-dark) 100%);
        }
        .stat-card-warning {
          background: linear-gradient(135deg, var(--warning) 0%, var(--warning-dark) 100%);
        }
      `}</style>
      
      {/* Header */}
      <div className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          Employee Profile Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {currentUser.employeeNumber} | {currentUser.roles.join(', ')}
          </span> */}
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {myProfile?.employeeNumber || 'Loading...'} | {roles.length ? roles.join(', ') : 'Loading...'}
          </span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error" style={{ margin: '1rem 2rem' }}>
          <AlertCircle size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ margin: '1rem 2rem' }}>
          <CheckCircle size={20} style={{ display: 'inline', marginRight: '0.5rem' }} />
          {success}
          <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      <div style={{ display: 'flex' }}>
        {/* Sidebar Navigation */}
        <div className="sidebar" style={{ width: '250px' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div 
              className={`sidebar-item ${activeView === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveView('overview')}
            >
              <User size={18} style={{ display: 'inline', marginRight: '0.75rem' }} />
              Overview
            </div>
            
            <div 
              className={`sidebar-item ${activeView === 'my-profile' ? 'active' : ''}`}
              onClick={() => setActiveView('my-profile')}
            >
              <User size={18} style={{ display: 'inline', marginRight: '0.75rem' }} />
              My Profile
            </div>

            {(isHR || isDeptHead) && (
              <div 
                className={`sidebar-item ${activeView === 'employees' ? 'active' : ''}`}
                onClick={() => setActiveView('employees')}
              >
                <Users size={18} style={{ display: 'inline', marginRight: '0.75rem' }} />
                {isDeptHead ? 'My Team' : 'All Employees'}
              </div>
            )}

            {isHR && (
              <>
                <div 
                  className={`sidebar-item ${activeView === 'create-employee' ? 'active' : ''}`}
                  onClick={() => setActiveView('create-employee')}
                >
                  <UserPlus size={18} style={{ display: 'inline', marginRight: '0.75rem' }} />
                  Create Employee
                </div>

                <div 
                  className={`sidebar-item ${activeView === 'change-requests' ? 'active' : ''}`}
                  onClick={() => setActiveView('change-requests')}
                >
                  <FileText size={18} style={{ display: 'inline', marginRight: '0.75rem' }} />
                  Change Requests
                </div>
              </>
            )}

            {hasRole('RECRUITER') && (
              <div 
                className={`sidebar-item ${activeView === 'create-candidate' ? 'active' : ''}`}
                onClick={() => setActiveView('create-candidate')}
              >
                <UserPlus size={18} style={{ display: 'inline', marginRight: '0.75rem' }} />
                Add Candidate
              </div>
            )}

            {(isDeptEmployee || hasRole('HR_EMPLOYEE')) && (
              <div 
                className={`sidebar-item ${activeView === 'submit-change' ? 'active' : ''}`}
                onClick={() => setActiveView('submit-change')}
              >
                <FileText size={18} style={{ display: 'inline', marginRight: '0.75rem' }} />
                Request Changes
              </div>
            )}
          </nav>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '2rem' }}>
          
          {/* Overview */}
          {activeView === 'overview' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Dashboard Overview</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div className="stat-card">
                  <Users size={32} style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {employees.length}
                  </div>
                  <div style={{ opacity: 0.9 }}>Total Employees</div>
                </div>

                {isHR && (
                  <div className="stat-card-warning">
                    <Clock size={32} style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {changeRequests.filter(r => r.status === 'PENDING').length}
                    </div>
                    <div style={{ opacity: 0.9 }}>Pending Requests</div>
                  </div>
                )}

                <div className="stat-card-success">
                  <CheckCircle size={32} style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    {changeRequests.filter(r => r.status === 'APPROVED').length}
                  </div>
                  <div style={{ opacity: 0.9 }}>Approved Requests</div>
                </div>
              </div>

              <div className="card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={() => setActiveView('my-profile')}>
                    View My Profile
                  </button>
                  {isHR && (
                    <>
                      <button className="btn-primary" onClick={() => setActiveView('create-employee')}>
                        Create Employee
                      </button>
                      <button className="btn-secondary" onClick={() => setActiveView('change-requests')}>
                        Review Requests
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* My Profile */}
          {activeView === 'my-profile' && myProfile && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>My Profile</h2>
              
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Profile Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <strong>Name:</strong> {myProfile.firstName} {myProfile.lastName}
                  </div>
                  <div>
                    <strong>Employee #:</strong> {myProfile.employeeNumber}
                  </div>
                  <div>
                    <strong>Work Email:</strong> {myProfile.workEmail || 'N/A'}
                  </div>
                  <div>
                    <strong>Personal Email:</strong> {myProfile.personalEmail || 'N/A'}
                  </div>
                  <div>
                    <strong>City:</strong> {myProfile.address?.city || 'N/A'}
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <strong>Biography:</strong> {myProfile.biography || 'No biography set'}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Update Profile (Immediate)</h3>
                <form onSubmit={updateSelfProfile}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Profile Picture URL</label>
                      <input 
                        className="form-input"
                        value={selfUpdateForm.profilePictureUrl}
                        onChange={(e) => setSelfUpdateForm({...selfUpdateForm, profilePictureUrl: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Personal Email</label>
                      <input 
                        className="form-input"
                        type="email"
                        value={selfUpdateForm.personalEmail}
                        onChange={(e) => setSelfUpdateForm({...selfUpdateForm, personalEmail: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Phone</label>
                      <input 
                        className="form-input"
                        value={selfUpdateForm.mobilePhone}
                        onChange={(e) => setSelfUpdateForm({...selfUpdateForm, mobilePhone: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input 
                        className="form-input"
                        value={selfUpdateForm.address.city}
                        onChange={(e) => setSelfUpdateForm({...selfUpdateForm, address: {...selfUpdateForm.address, city: e.target.value}})}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Biography</label>
                      <textarea 
                        className="form-input"
                        rows="3"
                        value={selfUpdateForm.biography}
                        onChange={(e) => setSelfUpdateForm({...selfUpdateForm, biography: e.target.value})}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                    Update Profile
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Employee List */}
          {activeView === 'employees' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
                  {isDeptHead ? 'My Team Members' : 'All Employees'}
                </h2>
                <div style={{ position: 'relative', width: '300px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input 
                    className="form-input"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="card">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee #</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map(emp => (
                      <tr key={emp._id}>
                        <td>{emp.employeeNumber}</td>
                        <td>{emp.firstName} {emp.lastName}</td>
                        <td>{emp.email}</td>
                        <td>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                            onClick={() => setSelectedEmployee(emp)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Create Employee */}
          {activeView === 'create-employee' && isHR && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Create New Employee</h2>
              <div className="card">
                <form onSubmit={createEmployee}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input 
                        className="form-input"
                        required
                        value={employeeForm.firstName}
                        onChange={(e) => setEmployeeForm({...employeeForm, firstName: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input 
                        className="form-input"
                        required
                        value={employeeForm.lastName}
                        onChange={(e) => setEmployeeForm({...employeeForm, lastName: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input 
                        className="form-input"
                        type="email"
                        required
                        value={employeeForm.email}
                        onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input 
                        className="form-input"
                        value={employeeForm.phone}
                        onChange={(e) => setEmployeeForm({...employeeForm, phone: e.target.value})}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Position</label>
                      <input 
                        className="form-input"
                        value={employeeForm.position}
                        onChange={(e) => setEmployeeForm({...employeeForm, position: e.target.value})}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                    Create Employee
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Create Candidate */}
          {activeView === 'create-candidate' && hasRole('RECRUITER') && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Add New Candidate</h2>
              <div className="card">
                <form onSubmit={createCandidate}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">First Name *</label>
                      <input 
                        className="form-input"
                        required
                        value={candidateForm.firstName}
                        onChange={(e) => setCandidateForm({...candidateForm, firstName: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input 
                        className="form-input"
                        required
                        value={candidateForm.lastName}
                        onChange={(e) => setCandidateForm({...candidateForm, lastName: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input 
                        className="form-input"
                        type="email"
                        required
                        value={candidateForm.email}
                        onChange={(e) => setCandidateForm({...candidateForm, email: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input 
                        className="form-input"
                        value={candidateForm.phone}
                        onChange={(e) => setCandidateForm({...candidateForm, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                    Add Candidate
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Change Requests List */}
          {activeView === 'change-requests' && isHR && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Profile Change Requests</h2>
              <div className="card">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Employee</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeRequests.map(req => (
                      <tr key={req.requestId}>
                        <td>{req.requestId}</td>
                        <td>
                          {req.employeeProfileId?.firstName} {req.employeeProfileId?.lastName}
                        </td>
                        <td>{req.requestDescription}</td>
                        <td><StatusBadge status={req.status} /></td>
                        <td>{new Date(req.submittedAt).toLocaleDateString()}</td>
                        <td>
                          {req.status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn-success"
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                                onClick={() => reviewChangeRequest(req.requestId, true)}
                              >
                                Approve
                              </button>
                              <button 
                                className="btn-danger"
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                                onClick={() => reviewChangeRequest(req.requestId, false)}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submit Change Request */}
          {activeView === 'submit-change' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Request Profile Changes</h2>
              <div className="card">
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Submit a request for critical profile changes that require HR approval.
                </p>
                <form onSubmit={submitChangeRequest}>
                  <div className="form-group">
                    <label className="form-label">Change Description *</label>
                    <textarea 
                      className="form-input"
                      rows="3"
                      required
                      placeholder="Describe the changes you want to make..."
                      value={changeRequestForm.requestDescription}
                      onChange={(e) => setChangeRequestForm({...changeRequestForm, requestDescription: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reason *</label>
                    <textarea 
                      className="form-input"
                      rows="3"
                      required
                      placeholder="Explain why these changes are needed..."
                      value={changeRequestForm.reason}
                      onChange={(e) => setChangeRequestForm({...changeRequestForm, reason: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="btn-primary">
                    Submit Request
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div 
          className="modal-overlay"
          style={{ 
            position: 'fixed', 
            inset: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            zIndex: 50
          }}
          onClick={() => setSelectedEmployee(null)}
        >
          <div 
            className="modal-content"
            style={{ width: '90%', maxWidth: '600px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Employee Details</h3>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '1.5rem', 
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Employee Number:</strong>
                  <div>{selectedEmployee.employeeNumber}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Name:</strong>
                  <div>{selectedEmployee.firstName} {selectedEmployee.lastName}</div>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-secondary)' }}>Email:</strong>
                  <div>{selectedEmployee.email}</div>
                </div>
                {selectedEmployee.phone && (
                  <div>
                    <strong style={{ color: 'var(--text-secondary)' }}>Phone:</strong>
                    <div>{selectedEmployee.phone}</div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setSelectedEmployee(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfileDashboard;