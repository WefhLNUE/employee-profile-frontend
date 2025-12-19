'use client';
import React, { useState, useEffect } from 'react';
import { User, Users, FileText, UserPlus, CheckCircle, AlertCircle, Clock, Search } from 'lucide-react';
import type {
  Address,
  Employee,
  ChangeRequest,
  CurrentUser,
  CandidateForm,
  EmployeeForm,
  ChangeRequestForm,
  SelfUpdateForm,
  APIResponse,
} from '@/app/employee-profile/types/employee-profile.types';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { SystemRole, EmployeeStatus } from './types/employee-profile.types';

// API Service
class APIService {
  private baseURL: string;

  constructor() {
    this.baseURL = 'http://localhost:5000';
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

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

  getAllEmployees(): Promise<Employee[]> {
    return this.request<Employee[]>('/employee-profile');
  }

  getEmployee(id: string): Promise<Employee> {
    return this.request<Employee>(`/employee-profile/${id}`);
  }

  getMyProfile(employeeNumber: string): Promise<Employee> {
    return this.request<Employee>(`/employee-profile/${employeeNumber}/my-profile`);
  }

  updateSelfImmediate(employeeNumber: string, data: Partial<SelfUpdateForm>): Promise<Employee> {
    return this.request<Employee>(`/employee-profile/${employeeNumber}/my-profile/immediate`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  createEmployee(data: Partial<EmployeeForm>): Promise<Employee> {
    return this.request<Employee>('/employee-profile', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  updateEmployeeAdmin(id: string, data: Partial<Employee>): Promise<Employee> {
    return this.request<Employee>(`/employee-profile/${id}/admin`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  getMyEmployees(): Promise<Employee[]> {
    return this.request<Employee[]>('/employee-profile/my-employees');
  }

  async createProfileChangeRequest(
    employeeNumber: string,
    data: {
      requestDescription: string;
      reason: string;
    }
  ) {
    return this.request(
      `/employee-profile/${employeeNumber}/my-profile/change-request`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }


  getAllChangeRequests(): Promise<ChangeRequest[]> {
    return this.request<ChangeRequest[]>('/employee-profile/change-requests/all');
  }

  reviewChangeRequest(
    requestId: string,
    data: { action: 'APPROVED' | 'REJECTED' | 'CANCELED'; patch?: any }
  ): Promise<ChangeRequest> {
    return this.request<ChangeRequest>(
      `/employee-profile/change-request/${requestId}/review`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  createCandidate(data: CandidateForm): Promise<any> {
    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
      fullName: `${data.firstName} ${data.lastName}`,
      workEmail: data.email,
      mobilePhone: data.phone,
      password: data.password,
      nationalId: data.nationalId,
      roles: [data.role],
    };
    return this.request<any>('/employee-profile/candidate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  getByRole(role: string): Promise<Employee[]> {
    return this.request<Employee[]>(`/employee-profile/roles?role=${role}`);
  }

  // getMyRole(): Promise<{ role: string; roles: string[] }> { 
  //   return this.request<{ role: string; roles: string[] }>('/employee-profile/myrole', { 
  //     headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
  //   }); 
  // }
  getMyRole(): Promise<{ roles: string[] }> {
    return this.request<{ roles: string[] }>('/employee-profile/myrole');
  }

  createLegalChangeRequest(
    employeeNumber: string,
    data: {
      newLegalFirstName?: string;
      newLegalLastName?: string;
      newMaritalStatus?: string;
      reason: string;
    }
  ) {
    return this.request(
      `/employee-profile/${employeeNumber}/my-profile/legal-change-request`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  getMyChangeRequests(employeeNumber: string): Promise<ChangeRequest[]> {
    return this.request<ChangeRequest[]>(`/employee-profile/${employeeNumber}/my-profile/change-requests`);
  }
}

const api = new APIService();

const EmployeeProfileDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<string>('overview');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [myTeam, setMyTeam] = useState<Employee[]>([]); // Department team members
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [myChangeRequests, setMyChangeRequests] = useState<ChangeRequest[]>([]);
  const [myProfile, setMyProfile] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roles, setRoles] = useState<string[]>([]);
  const [role, setRole] = useState<string>('');

  const [currentUser] = useState<CurrentUser>({
    employeeNumber: 'EMP-1001',
    roles: ['HR_MANAGER'],
    primaryDepartmentId: '507f1f77bcf86cd799439011'
  });
  const router = useRouter();
  const goToDetails = (requestId: string) => {
    router.push(`/employee-profile/change-request/${requestId}`);
  };
  const goToEmployeeDetails = (employeeId: string) => {
    router.push(`/employee-profile/${employeeId}`);
  };
  const goToHierarchy = () => {
    router.push(`organization-structure/hierarchy`);
  };

  const [candidateForm, setCandidateForm] = useState<CandidateForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: SystemRole.JOB_CANDIDATE,
    nationalId: '',

  });

  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: ''
  });

  const [changeRequest, setChangeRequest] = useState({
    requestDescription: '',
    reason: '',
  });
  const [legalChangeRequest, setLegalChangeRequest] = useState({
    newLegalFirstName: '',
    newLegalLastName: '',
    newMaritalStatus: '',
    reason: '',
  });
  const [crSuccess, setCrSuccess] = useState('');
  const [crError, setCrError] = useState('');
  const [legalCrSuccess, setLegalCrSuccess] = useState('');
  const [legalCrError, setLegalCrError] = useState('');


  const [selfUpdateForm, setSelfUpdateForm] = useState<SelfUpdateForm>({
    profilePictureUrl: '',
    biography: '',
    personalEmail: '',
    mobilePhone: '',
    address: { city: '', streetAddress: '', country: '' }
  });

  const hasRole = (r: string): boolean => roles.includes(r);
  const isHR = hasRole('HR Manager') || hasRole('HR Admin');
  const isHRAdmin = hasRole('HR Admin');
  const isHRManager = hasRole('HR Manager');
  const isRecruiter = hasRole('Recruiter');
  const isDeptHead = hasRole('department head');
  const isDeptEmployee = hasRole('department employee');
  const isHREmployee = hasRole('HR Employee');
  const isSystemAdmin = hasRole('System Admin');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch roles first
        const data = await api.getMyRole();
        // console.log(data);
        console.log('role extracted', ' + ', data.roles);
        setRoles(data.roles);
        // setRole(data.role);

        // Fetch profile
        const profile = await api.getMyProfile(currentUser.employeeNumber);
        setMyProfile(profile);

        console.log('Current logged-in user profile:', profile);
        console.log('Current logged-in user roles:', data.roles);
      } catch (err: any) {
        console.error('Failed to fetch initial data:', err);
        setError(err.message || 'Failed to fetch initial data');
      }
    };
    fetchInitialData();
    //   fetchChangeRequests();

  }, []);

  useEffect(() => {
    if (!roles.length) return;

    if (isHR || isHREmployee) {
      api.getAllChangeRequests().then(setChangeRequests);
    }
    if (isHR || isDeptHead || isSystemAdmin) {
      loadEmployees();
    }
    // Load team members for department heads
    if (isDeptHead) {
      loadMyTeam();
    }
  }, [roles]); // run after roles are set

  useEffect(() => {
    if (activeView === 'change-requests') {
      const fetchRequests = async () => {
        setLoading(true);
        try {
          const data = await api.getAllChangeRequests();
          console.log('Change Requests fetched:', data);
          setChangeRequests(data);
        } catch (err: any) {
          console.error('Failed to fetch change requests:', err);
          setError(err.message || 'Failed to fetch change requests');
        } finally {
          setLoading(false);
        }
      };
      fetchRequests();
    }

    if (activeView === 'my-change-requests' && myProfile) {
      const fetchMyRequests = async () => {
        setLoading(true);
        try {
          const data = await api.getMyChangeRequests(myProfile.employeeNumber);
          setMyChangeRequests(data);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch your change requests');
        } finally {
          setLoading(false);
        }
      };
      fetchMyRequests();
    }
  }, [activeView, myProfile]);

  const loadEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAllEmployees();
      setEmployees(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const loadMyTeam = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getMyEmployees();
      setMyTeam(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  };


  // const fetchChangeRequests = async () => {
  //   setLoading(true);
  //   try {
  //     const data = await api.getAllChangeRequests();
  //     console.log(data);
  //     setChangeRequests(data);
  //   } catch (err: any) {
  //     setError(err.message || 'Failed to fetch change requests');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchMyProfile = async () => {
    try {
      const data = await api.getMyProfile(currentUser.employeeNumber);
      setMyProfile(data);
    } catch (err) {
      setError('Failed to fetch profile');
    }
  };

  // const createEmployee = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   try {
  //     setSuccess('Employee created successfully');
  //     setEmployeeForm({ firstName: '', lastName: '', email: '', phone: '', position: '' });
  //     loadEmployees();
  //   } catch {
  //     setError('Failed to create employee');
  //   }
  // };

  const createCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCandidate(candidateForm);
      setSuccess('Candidate created successfully');
      setCandidateForm({ firstName: '', lastName: '', email: '', phone: '', password: '', role: SystemRole.JOB_CANDIDATE, nationalId: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to create candidate');
    }
  };

  const updateSelfProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!myProfile?.employeeNumber) {
      setError('Employee number not loaded');
      return;
    }

    try {
      await api.updateSelfImmediate(myProfile.employeeNumber, {
        profilePictureUrl: selfUpdateForm.profilePictureUrl || undefined,
        biography: selfUpdateForm.biography || undefined,
        personalEmail: selfUpdateForm.personalEmail || undefined,
        mobilePhone: selfUpdateForm.mobilePhone || undefined,
        address: {
          streetAddress: selfUpdateForm.address.streetAddress || undefined,
          city: selfUpdateForm.address.city || undefined,
          country: selfUpdateForm.address.country || undefined,
        },
      });

      setSuccess('Profile updated successfully');
      await fetchMyProfile();

      // Reload page after a short delay to update menubar with new photo
      setTimeout(() => {
        window.location.reload();
      }, 500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update profile');
    }
  };


  const submitChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setCrSuccess('');
    setCrError('');

    try {
      await api.createProfileChangeRequest(
        myProfile?.employeeNumber || '',
        changeRequest
      );

      setCrSuccess('Change request submitted successfully');

      setChangeRequest({
        requestDescription: '',
        reason: '',
      });
    } catch (err) {
      setCrError('Failed to submit change request');
    }
  };

  const submitLegalChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLegalCrSuccess('');
    setLegalCrError('');

    try {
      await api.createLegalChangeRequest(
        myProfile?.employeeNumber || '',
        legalChangeRequest
      );

      setLegalCrSuccess('Legal change request submitted successfully');

      setLegalChangeRequest({
        newLegalFirstName: '',
        newLegalLastName: '',
        newMaritalStatus: '',
        reason: '',
      });
    } catch (err) {
      setLegalCrError('Failed to submit legal change request');
    }
  };


  const reviewChangeRequest = async (requestId: string, action: 'APPROVED' | 'REJECTED' | 'CANCELED') => {
    try {
      // Call your API with the action string
      await api.reviewChangeRequest(requestId, { action });

      setSuccess(`Change request ${action.toLowerCase()}`);

      // Refresh the change requests list
      const updatedRequests = await api.getAllChangeRequests();
      console.log('Updated Change Requests:', updatedRequests);
      setChangeRequests(updatedRequests);
    } catch (err: any) {
      console.error('Failed to review change request:', err);
      setError(err.message || 'Failed to review change request');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;
    try {
      await api.reviewChangeRequest(requestId, { action: 'CANCELED' });
      setSuccess('Request canceled successfully');

      // Refresh the list if we are in the my-profile view
      if (myProfile) {
        const data = await api.getMyChangeRequests(myProfile.employeeNumber);
        setMyChangeRequests(data);
      }
    } catch (err: any) {
      console.error('Failed to cancel request:', err);
      setError(err.message || 'Failed to cancel request');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatusBadge: React.FC<{ status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' }> = ({ status }) => {
    const styles: Record<string, string> = {
      PENDING: 'badge-pending',
      APPROVED: 'badge-approved',
      REJECTED: 'badge-rejected',
      CANCELED: 'badge-cancelled'
    };
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

            {(isHR || isDeptHead || isSystemAdmin) && (
              <div
                className={`sidebar-item ${activeView === 'employees' ? 'active' : ''}`}
                onClick={() => setActiveView('employees')}
              >
                <Users size={18} style={{ display: 'inline', marginRight: '0.75rem' }} />
                {isDeptHead ? 'My Team' : 'All Employees'}
              </div>
            )}

            {isRecruiter && (
              <>
                <div
                  className={`sidebar-item ${activeView === 'create-candidate' ? 'active' : ''}`}
                  onClick={() => setActiveView('create-candidate')}
                >
                  <UserPlus size={18} style={{ display: 'inline', marginRight: '0.75rem' }} />
                  Create Candidate
                </div>
              </>
            )}
            {isHR && (
              <>
                <div
                  className={`sidebar-item ${activeView === 'change-requests' ? 'active' : ''}`}
                  onClick={() => setActiveView('change-requests')}
                >
                  <FileText size={18} style={{ display: 'inline', marginRight: '0.75rem' }} />
                  Change Requests
                </div>
              </>
            )}

            {!isHR && (
              <div
                className={`sidebar-item ${activeView === 'my-change-requests' ? 'active' : ''}`}
                onClick={() => setActiveView('my-change-requests')}
              >
                <Clock size={18} style={{ display: 'inline', marginRight: '0.75rem' }} />
                My Change Requests
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
              <button
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}
                onClick={() => window.location.reload()} // refresh page
                title="Refresh Dashboard"
              >
                <RefreshCw size={18} />
                Refresh
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {isHR && (
                  <div className="stat-card">
                    <Users size={32} style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {employees.length}
                    </div>
                    <div style={{ opacity: 0.9 }}>Total Employees</div>
                  </div>
                )}

                {isDeptHead && (
                  <div className="stat-card">
                    <Users size={32} style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {myTeam.length}
                    </div>
                    <div style={{ opacity: 0.9 }}>My Team</div>
                  </div>
                )}

                {isHR && (
                  <div className="stat-card-warning">
                    <Clock size={32} style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {changeRequests.filter(r => r.status === 'PENDING').length}
                    </div>
                    <div style={{ opacity: 0.9 }}>Pending Requests</div>
                  </div>
                )}

                {isHR && (
                  <div className="stat-card-success">
                    <CheckCircle size={32} style={{ marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {changeRequests.filter(r => r.status === 'APPROVED').length}
                    </div>
                    <div style={{ opacity: 0.9 }}>Approved Requests</div>
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Quick Actions</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={() => setActiveView('my-profile')}>
                    View My Profile
                  </button>
                  {isDeptHead && (
                    <>
                      <button className="btn-primary" onClick={() => goToHierarchy()}>
                        View My Heirarchy
                      </button>
                    </>
                  )}
                  {isRecruiter && (
                    <>
                      <button className="btn-primary" onClick={() => setActiveView('create-candidate')}>
                        Create Candidate
                      </button>
                    </>
                  )}
                  {isHR && (
                    <>
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

                {/* Profile Picture Display */}
                {myProfile.profilePictureUrl && (
                  <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                    <img
                      src={myProfile.profilePictureUrl}
                      alt="Profile"
                      style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '50%',
                        border: '3px solid var(--primary-200)',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                      }}
                    />
                  </div>
                )}

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
                  {/* Address Section */}
                  <div
                    style={{
                      gridColumn: 'span 2',
                      border: '1px solid var(--border-light)',
                      borderRadius: '0.75rem',
                      padding: '1rem',
                      backgroundColor: 'var(--bg-secondary)',
                    }}
                  >
                    <strong
                      style={{
                        display: 'block',
                        marginBottom: '0.75rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Address
                    </strong>

                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>Street:</strong>{' '}
                      {myProfile.address?.streetAddress || 'N/A'}
                    </div>

                    <div style={{ marginBottom: '0.25rem' }}>
                      <strong>City:</strong> {myProfile.address?.city || 'N/A'}
                    </div>

                    <div>
                      <strong>Country:</strong> {myProfile.address?.country || 'N/A'}
                    </div>
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
                      <label className="form-label">Profile Picture</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* File Upload */}
                        <input
                          type="file"
                          accept="image/*"
                          className="form-input"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Check file size (max 2MB)
                              if (file.size > 2 * 1024 * 1024) {
                                setError('Image size must be less than 2MB');
                                return;
                              }

                              // Convert to base64
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setSelfUpdateForm({
                                  ...selfUpdateForm,
                                  profilePictureUrl: reader.result as string
                                });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        {/* URL Input (alternative) */}
                        <input
                          className="form-input"
                          placeholder="Or paste image URL"
                          value={selfUpdateForm.profilePictureUrl}
                          onChange={(e) => setSelfUpdateForm({ ...selfUpdateForm, profilePictureUrl: e.target.value })}
                        />
                        {/* Preview */}
                        {selfUpdateForm.profilePictureUrl && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <img
                              src={selfUpdateForm.profilePictureUrl}
                              alt="Preview"
                              style={{
                                width: '100px',
                                height: '100px',
                                objectFit: 'cover',
                                borderRadius: '50%',
                                border: '2px solid var(--border-light)'
                              }}
                              onError={() => setError('Invalid image URL or file')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Personal Email</label>
                      <input
                        className="form-input"
                        type="email"
                        value={selfUpdateForm.personalEmail}
                        onChange={(e) => setSelfUpdateForm({ ...selfUpdateForm, personalEmail: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Phone</label>
                      <input
                        className="form-input"
                        value={selfUpdateForm.mobilePhone}
                        onChange={(e) => setSelfUpdateForm({ ...selfUpdateForm, mobilePhone: e.target.value })}
                      />
                    </div>
                    {/* Address Section */}
                    <div
                      style={{
                        gridColumn: 'span 2',
                        border: '1px solid var(--border-light)',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        marginTop: '0.5rem',
                        backgroundColor: 'var(--bg-secondary)',
                      }}
                    >
                      <h4
                        style={{
                          marginBottom: '1rem',
                          color: 'var(--text-secondary)',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                        }}
                      >
                        Address
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label className="form-label">Street Address</label>
                          <input
                            className="form-input"
                            value={selfUpdateForm.address.streetAddress}
                            onChange={(e) =>
                              setSelfUpdateForm({
                                ...selfUpdateForm,
                                address: {
                                  ...selfUpdateForm.address,
                                  streetAddress: e.target.value,
                                },
                              })
                            }
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">City</label>
                          <input
                            className="form-input"
                            value={selfUpdateForm.address.city}
                            onChange={(e) =>
                              setSelfUpdateForm({
                                ...selfUpdateForm,
                                address: {
                                  ...selfUpdateForm.address,
                                  city: e.target.value,
                                },
                              })
                            }
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Country</label>
                          <input
                            className="form-input"
                            value={selfUpdateForm.address.country}
                            onChange={(e) =>
                              setSelfUpdateForm({
                                ...selfUpdateForm,
                                address: {
                                  ...selfUpdateForm.address,
                                  country: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Biography</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        value={selfUpdateForm.biography}
                        onChange={(e) => setSelfUpdateForm({ ...selfUpdateForm, biography: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                    Update Profile
                  </button>
                </form>
              </div>

              {/* Submit Change Request - BELOW Update Profile */}
              {(isDeptEmployee || isHREmployee) && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Request Profile Changes</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Submit a request for critical profile changes that require HR approval.
                  </p>
                  <form onSubmit={submitChangeRequest}>
                    <div className="form-group">
                      <label className="form-label">Change Description *</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        required
                        placeholder="Describe the changes you want to make..."
                        value={changeRequest.requestDescription}
                        onChange={(e) => setChangeRequest({ ...changeRequest, requestDescription: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Reason *</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        required
                        placeholder="Explain why these changes are needed..."
                        value={changeRequest.reason}
                        onChange={(e) => setChangeRequest({ ...changeRequest, reason: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn-primary">
                      Submit Request
                    </button>
                  </form>
                </div>
              )}

              {/* Legal Name/Marital Status Change Request - BELOW Profile Change Request */}
              {(isDeptEmployee) && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Legal Name / Marital Status Change Request</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Submit a request to change your legal name or marital status.
                  </p>
                  {legalCrSuccess && <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: '0.5rem' }}>{legalCrSuccess}</div>}
                  {legalCrError && <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '0.5rem' }}>{legalCrError}</div>}
                  <form onSubmit={submitLegalChangeRequest}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      <div className="form-group">
                        <label className="form-label">New Legal First Name</label>
                        <input
                          className="form-input"
                          placeholder="Leave blank if no change"
                          value={legalChangeRequest.newLegalFirstName}
                          onChange={(e) => setLegalChangeRequest({ ...legalChangeRequest, newLegalFirstName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">New Legal Last Name</label>
                        <input
                          className="form-input"
                          placeholder="Leave blank if no change"
                          value={legalChangeRequest.newLegalLastName}
                          onChange={(e) => setLegalChangeRequest({ ...legalChangeRequest, newLegalLastName: e.target.value })}
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">New Marital Status</label>
                        <select
                          className="form-input"
                          value={legalChangeRequest.newMaritalStatus}
                          onChange={(e) => setLegalChangeRequest({ ...legalChangeRequest, newMaritalStatus: e.target.value })}
                        >
                          <option value="">-- No Change --</option>
                          <option value="SINGLE">Single</option>
                          <option value="MARRIED">Married</option>
                          <option value="DIVORCED">Divorced</option>
                          <option value="WIDOWED">Widowed</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label className="form-label">Reason *</label>
                      <textarea
                        className="form-input"
                        rows={3}
                        required
                        placeholder="Explain why this change is needed..."
                        value={legalChangeRequest.reason}
                        onChange={(e) => setLegalChangeRequest({ ...legalChangeRequest, reason: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                      Submit Legal Change Request
                    </button>
                  </form>
                </div>
              )}
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

              {/* ACTIVE EMPLOYEES TABLE */}
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Active Employees</h3>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee #</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Position</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees
                      .filter(emp => emp.status === EmployeeStatus.ACTIVE || !emp.status) // defaulting to ACTIVE if undefined
                      .map(emp => (
                        <tr key={emp._id}>
                          <td>{emp.employeeNumber}</td>
                          <td>{emp.firstName} {emp.lastName}</td>
                          <td>{emp.workEmail}</td>
                          <td>{emp.primaryDepartmentId?.name || 'N/A'}</td>
                          <td>{emp.primaryPositionId?.title || 'N/A'}</td>
                          <td>
                            <button
                              className="btn-secondary"
                              style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                              onClick={() => goToEmployeeDetails(emp._id)}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* INACTIVE EMPLOYEES TABLE */}
              {isHR && (
                <div className="card">
                  <h3 style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Inactive / Terminated Employees</h3>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Employee #</th>
                        <th>Name</th>
                        <th>Work Email</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees
                        .filter(emp => emp.status && emp.status !== EmployeeStatus.ACTIVE)
                        .map(emp => (
                          <tr key={emp._id}>
                            <td>{emp.employeeNumber}</td>
                            <td>{emp.firstName} {emp.lastName}</td>
                            <td>{emp.workEmail}</td>
                            <td>
                              <span style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '1rem',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                backgroundColor:
                                  (emp.status === EmployeeStatus.TERMINATED || emp.status === EmployeeStatus.SUSPENDED) ? '#fee2e2' :
                                    emp.status === EmployeeStatus.RETIRED ? '#e0e7ff' :
                                      '#f3f4f6',
                                color:
                                  (emp.status === EmployeeStatus.TERMINATED || emp.status === EmployeeStatus.SUSPENDED) ? '#b91c1c' :
                                    emp.status === EmployeeStatus.RETIRED ? '#4338ca' :
                                      '#374151'
                              }}>
                                {emp.status}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn-secondary"
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                                onClick={() => goToEmployeeDetails(emp._id)}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {filteredEmployees.filter(emp => emp.status && emp.status !== EmployeeStatus.ACTIVE).length === 0 && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No inactive employees found.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Create Employee
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
          )} */}
          {/* Create Candidate */}
          {activeView === 'create-candidate' && hasRole('Recruiter') && (
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
                        onChange={(e) => setCandidateForm({ ...candidateForm, firstName: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last Name *</label>
                      <input
                        className="form-input"
                        required
                        value={candidateForm.lastName}
                        onChange={(e) => setCandidateForm({ ...candidateForm, lastName: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        className="form-input"
                        type="email"
                        required
                        value={candidateForm.email}
                        onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input
                        className="form-input"
                        value={candidateForm.phone}
                        onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password *</label>
                      <input
                        className="form-input"
                        type="password"
                        required
                        value={candidateForm.password}
                        onChange={(e) => setCandidateForm({ ...candidateForm, password: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">National ID *</label>
                      <input
                        className="form-input"
                        required
                        value={candidateForm.nationalId}
                        onChange={(e) => setCandidateForm({ ...candidateForm, nationalId: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Role *</label>
                      <select
                        className="form-input"
                        required
                        value={candidateForm.role}
                        onChange={(e) => setCandidateForm({ ...candidateForm, role: e.target.value as SystemRole })}
                      >
                        <option value={SystemRole.JOB_CANDIDATE}>
                          {SystemRole.JOB_CANDIDATE.replace('_', ' ')}
                        </option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                    Add Candidate
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Create Candidate
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
                    <div className="form-group">
                      <label className="form-label">Password *</label>
                      <input 
                        className="form-input"
                        type="password"
                        required
                        value={candidateForm.password}
                        onChange={(e) => setCandidateForm({...candidateForm, password: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Role *</label>
                      <select
                        className="form-input"
                        required
                        value={candidateForm.role}
                        onChange={(e) => setCandidateForm({...candidateForm, role: e.target.value as SystemRole})}
                      >
                        <option value={SystemRole.JOB_CANDIDATE}>Job Candidate</option>
                        <option value={SystemRole.DEPARTMENT_EMPLOYEE}>Department Employee</option>
                        <option value={SystemRole.DEPARTMENT_HEAD}>Department Head</option>
                        <option value={SystemRole.HR_MANAGER}>HR Manager</option>
                        <option value={SystemRole.HR_EMPLOYEE}>HR Employee</option>
                        <option value={SystemRole.HR_ADMIN}>HR Admin</option>
                        <option value={SystemRole.PAYROLL_SPECIALIST}>Payroll Specialist</option>
                        <option value={SystemRole.PAYROLL_MANAGER}>Payroll Manager</option>
                        <option value={SystemRole.SYSTEM_ADMIN}>System Admin</option>
                        <option value={SystemRole.LEGAL_POLICY_ADMIN}>Legal & Policy Admin</option>
                        <option value={SystemRole.RECRUITER}>Recruiter</option>
                        <option value={SystemRole.FINANCE_STAFF}>Finance Staff</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                    Add Candidate
                  </button>
                </form>
              </div>
            </div>
          )} */}

          {/* Change Requests List */}
          {activeView === 'change-requests' && (isHR) && (
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
                                onClick={() => reviewChangeRequest(req.requestId, 'APPROVED')}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-danger"
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                                onClick={() => reviewChangeRequest(req.requestId, 'REJECTED')}
                              >
                                Reject
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                                onClick={() => reviewChangeRequest(req.requestId, 'CANCELED')}
                              >
                                Cancel
                              </button>
                              <button
                                className="btn-secondary"
                                onClick={() => goToDetails(req.requestId)}
                              >
                                See Details
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

          {/* My Change Requests List */}
          {activeView === 'my-change-requests' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>My Profile Change Requests</h2>
              <div className="card">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myChangeRequests.map(req => (
                      <tr key={req.requestId}>
                        <td>{req.requestId}</td>
                        <td>{req.requestDescription}</td>
                        <td><StatusBadge status={req.status} /></td>
                        <td>{new Date(req.submittedAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn-secondary"
                              onClick={() => goToDetails(req.requestId)}
                            >
                              See Details
                            </button>
                            {req.status === 'PENDING' && (
                              <button
                                className="btn-secondary"
                                style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }}
                                onClick={() => handleCancelRequest(req.requestId)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submit Change Request
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
                      rows={3}
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
                      rows={3}
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
          )} */}
        </div>
      </div>

      {/* Employee Details Modal */}
      {
        selectedEmployee && (
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
        )
      }
    </div >
  );
};

export default EmployeeProfileDashboard;