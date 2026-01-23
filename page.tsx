'use client';
import React, { useState, useEffect } from 'react';
import OrgChangeRequestModal from './components/OrgChangeRequestModal';
import {
  User, Users, FileText, UserPlus, CheckCircle, AlertCircle,
  Clock, Search, ArrowUpDown, Briefcase, Shield, Network,
  Send, Mail, RefreshCw
} from 'lucide-react';
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
import { useRouter, useSearchParams } from 'next/navigation';
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
  getMyRole(): Promise<{ roles: string[], employeeNumber: string, primaryDepartmentId: string }> {
    return this.request<{ roles: string[], employeeNumber: string, primaryDepartmentId: string }>('/employee-profile/myrole');
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

  async sendNotification(data: { to: string; message: string }): Promise<any> {
    return this.request<any>('/notifications/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data: any[]) => {
    if (!sortConfig) return data;
    const { key, direction } = sortConfig;
    return [...data].sort((a: any, b: any) => {
      let aValue = a[key];
      let bValue = b[key];

      // Handle nested department/position objects
      if (key === 'department') {
        aValue = a.primaryDepartmentId?.name || '';
        bValue = b.primaryDepartmentId?.name || '';
      } else if (key === 'position') {
        aValue = a.primaryPositionId?.title || '';
        bValue = b.primaryPositionId?.title || '';
      } else if (key === 'name') {
        aValue = `${a.firstName} ${a.lastName}`;
        bValue = `${b.firstName} ${b.lastName}`;
      } else {
        aValue = aValue || '';
        bValue = bValue || '';
      }

      const strA = String(aValue).toLowerCase();
      const strB = String(bValue).toLowerCase();

      if (strA < strB) return direction === 'asc' ? -1 : 1;
      if (strA > strB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle URL view parameter
  useEffect(() => {
    const viewParam = searchParams.get('view') || 'overview';
    setActiveView(viewParam);
  }, [searchParams]);

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

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Send Notification States
  const [notificationForm, setNotificationForm] = useState({ targetEmployeeId: '', message: '' });
  const [recipientSearch, setRecipientSearch] = useState('');
  const [notifSuccess, setNotifSuccess] = useState('');
  const [notifError, setNotifError] = useState('');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Org Change Request Modal State
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [orgModalDescription, setOrgModalDescription] = useState('');
  const [orgModalEmployeeId, setOrgModalEmployeeId] = useState('');

  // ...

  const reviewChangeRequest = async (requestId: string, action: 'APPROVED' | 'REJECTED' | 'CANCELED') => {
    try {
      await api.reviewChangeRequest(requestId, { action });
      setSuccess(`Change request ${action.toLowerCase()}`);

      // Check if it's a standard request (REQ-) and is APPROVED -> Trigger Confirmation
      if (action === 'APPROVED' && requestId.startsWith('REQ-') && !requestId.startsWith('LEGAL-REQ-')) {
        const approvedReq = changeRequests.find(r => r.requestId === requestId);
        setOrgModalDescription(approvedReq?.requestDescription || '');
        setOrgModalEmployeeId(approvedReq?.employeeProfileId?._id || '');
        setIsConfirmationOpen(true);
      }

      const updatedRequests = await api.getAllChangeRequests();
      setChangeRequests(updatedRequests);
    } catch (err: any) {
      console.error('Failed to review change request:', err);
      setError(err.message || 'Failed to review change request');
    }
  };

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
        setCurrentUser({
          employeeNumber: data.employeeNumber,
          roles: data.roles,
          primaryDepartmentId: data.primaryDepartmentId
        });

        // Fetch profile
        if (data.employeeNumber) {
          const profile = await api.getMyProfile(data.employeeNumber);
          setMyProfile(profile);

          setSelfUpdateForm({
            profilePictureUrl: profile.profilePictureUrl || '',
            biography: profile.biography || '',
            personalEmail: profile.personalEmail || '',
            mobilePhone: profile.mobilePhone || '',
            address: {
              city: profile.address?.city || '',
              streetAddress: profile.address?.streetAddress || '',
              country: profile.address?.country || ''
            }
          });
        }
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
    // Load team members for department heads ONLY if they have a department assigned
    if (isDeptHead && currentUser?.primaryDepartmentId) {
      loadMyTeam();
    }
  }, [roles, currentUser]); // run after roles and currentUser are set

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

  useEffect(() => {
    if (activeView === 'my-department' && isDeptHead && currentUser?.primaryDepartmentId) {
      loadMyTeam();
    }
  }, [activeView, isDeptHead, currentUser]);

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
    if (!currentUser?.primaryDepartmentId) return;
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
    if (!currentUser?.employeeNumber) return;
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
      // Only send fields that have values
      const payload: any = {
        reason: legalChangeRequest.reason
      };

      if (legalChangeRequest.newLegalFirstName?.trim()) {
        payload.newLegalFirstName = legalChangeRequest.newLegalFirstName;
      }
      if (legalChangeRequest.newLegalLastName?.trim()) {
        payload.newLegalLastName = legalChangeRequest.newLegalLastName;
      }
      if (legalChangeRequest.newMaritalStatus?.trim()) {
        payload.newMaritalStatus = legalChangeRequest.newMaritalStatus;
      }

      await api.createLegalChangeRequest(
        myProfile?.employeeNumber || '',
        payload
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



  const handleCancelRequest = (requestId: string) => {
    setSelectedRequestId(requestId);
    setShowCancelModal(true);
  };

  const confirmCancelRequest = async () => {
    if (!selectedRequestId) return;
    try {
      await api.reviewChangeRequest(selectedRequestId, { action: 'CANCELED' });
      setSuccess('Request canceled successfully');
      setShowCancelModal(false);
      setSelectedRequestId(null);

      // Refresh the list if we are in the my-profile view
      if (myProfile) {
        const data = await api.getMyChangeRequests(myProfile.employeeNumber);
        setMyChangeRequests(data);
      }
    } catch (err: any) {
      console.error('Failed to cancel request:', err);
      setError(err.message || 'Failed to cancel request');
      setShowCancelModal(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationForm.targetEmployeeId || !notificationForm.message) {
      setNotifError('Please select an employee and enter a message');
      return;
    }

    setIsSendingNotif(true);
    setNotifError('');
    setNotifSuccess('');

    try {
      await api.sendNotification({ to: notificationForm.targetEmployeeId, message: notificationForm.message });
      setNotifSuccess('Notification sent successfully!');
      setNotificationForm({ targetEmployeeId: '', message: '' });
      setRecipientSearch('');
    } catch (err: any) {
      console.error('Failed to send notification:', err);
      setNotifError(err.message || 'Failed to send notification');
    } finally {
      setIsSendingNotif(false);
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
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', zoom: 0.85 }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

      <style>{`
        :root {
          --primary-50: #f5f3ff;
          --primary-100: #ede9fe;
          --primary-200: #ddd6fe;
          --primary-300: #c4b5fd;
          --primary-400: #a78bfa;
          --primary-500: #8b5cf6;
          --primary-600: #7c3aed;
          --primary-700: #6d28d9;
          --primary-800: #5b21b6;
          --primary-900: #4c1d95;
          
          --slate-50: #f8fafc;
          --slate-100: #f1f5f9;
          --slate-200: #e2e8f0;
          --slate-300: #cbd5e1;
          --slate-400: #94a3b8;
          --slate-500: #64748b;
          --slate-600: #475569;
          --slate-700: #334155;
          --slate-800: #1e293b;
          --slate-900: #0f172a;
          
          --success: #10b981;
          --success-dark: #059669;
          --warning: #f59e0b;
          --warning-dark: #d97706;
          --error: #ef4444;
          --error-dark: #dc2626;
          
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-dark: #0f172a;
          --bg-hover: #f1f5f9;
          
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-tertiary: #94a3b8;
          --text-inverse: #ffffff;
          
          --border-light: #e2e8f0;
          --border-medium: #cbd5e1;
          --border-focus: #7c3aed;

          --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
          --radius-md: 0.75rem;
          --radius-lg: 1rem;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
        
        .btn-primary {
          background-color: var(--primary-600);
          color: var(--text-inverse);
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-sm);
        }
        .btn-primary:hover { 
          background-color: var(--primary-700);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }
        .btn-primary:active { transform: translateY(0); }
        
        .btn-secondary {
          background-color: var(--bg-primary);
          color: var(--text-primary);
          border: 1px solid var(--border-light);
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover { 
          background-color: var(--bg-secondary);
          border-color: var(--border-medium);
        }
        
        .card {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: var(--shadow-md);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card:hover {
          box-shadow: var(--shadow-lg);
        }
        
        .table-container {
          background-color: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          border-spacing: 0;
        }
        .table thead {
          background-color: var(--slate-50);
          border-bottom: 1px solid var(--border-light);
        }
        .table th {
          color: var(--slate-600);
          font-weight: 600;
          padding: 1rem;
          text-align: left;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .table td {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid var(--border-light);
          color: var(--text-primary);
          font-size: 0.875rem;
          transition: background-color 0.2s ease;
        }
        .table tbody tr:last-child td { border-bottom: none; }
        .table tbody tr:hover td { background-color: var(--bg-hover); }
        
        .form-group { margin-bottom: 1.5rem; }
        .form-label {
          display: block;
          color: var(--slate-700);
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          color: var(--text-primary);
          background-color: var(--bg-primary);
          transition: all 0.2s ease;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--primary-500);
          box-shadow: 0 0 0 4px var(--primary-50);
        }
        
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.025em;
        }
        .badge-pending { background-color: #fffbeb; color: #b45309; }
        .badge-approved { background-color: #ecfdf5; color: #047857; }
        .badge-rejected { background-color: #fef2f2; color: #b91c1c; }
        .badge-cancelled { background-color: #f1f5f9; color: #475569; }
        
        .sidebar {
          background-color: var(--bg-dark);
          color: var(--text-inverse);
          height: calc(100vh / 0.85); /* Account for zoom to fill screen */
          width: 280px;
          position: sticky;
          top: 0;
          padding: 2.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          box-shadow: 4px 0 24px rgba(0,0,0,0.1);
          overflow-y: auto;
          z-index: 20;
        }
        .sidebar-item {
          padding: 0.875rem 1.25rem;
          border-radius: var(--radius-md);
          color: var(--slate-400);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-item:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: var(--text-inverse);
          padding-left: 1.5rem;
        }
        .sidebar-item.active {
          background-color: var(--primary-600);
          color: var(--text-inverse);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
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

        /* Premium Quick Button Styles */
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .quick-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1.5rem;
          background-color: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 1rem;
          color: var(--text-primary);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-align: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .quick-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-100%);
          transition: 0.6s;
        }

        .quick-btn:hover {
          transform: translateY(-5px);
          border-color: var(--primary-400);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          background-color: var(--primary-50);
        }

        .quick-btn:hover::before {
          transform: translateX(100%);
        }

        .quick-btn:hover .icon-container {
          transform: scale(1.1) rotate(5deg);
          color: var(--primary-600);
        }

        .icon-container {
          padding: 0.75rem;
          border-radius: 0.75rem;
          background-color: var(--primary-50);
          color: var(--primary-500);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fadeIn 0.5s ease forwards;
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
        {/* Sidebar */}
        <div className="sidebar">
          <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
            <div style={{ backgroundColor: 'var(--primary-600)', padding: '0.5rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'white' }}>HR System</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Employee Portal</div>
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div
              className={`sidebar-item ${activeView === 'overview' ? 'active' : ''}`}
              onClick={() => router.push('/employee-profile')}
            >
              <ArrowUpDown size={20} />
              Overview
            </div>

            <div
              className={`sidebar-item ${activeView === 'my-profile' ? 'active' : ''}`}
              onClick={() => router.push('/employee-profile?view=my-profile')}
            >
              <User size={20} />
              My Profile
            </div>

            {((isHR || isHREmployee) || isSystemAdmin) && (
              <div
                className={`sidebar-item ${activeView === 'employees' ? 'active' : ''}`}
                onClick={() => router.push('/employee-profile?view=employees')}
              >
                <Users size={20} />
                All Employees
              </div>
            )}

            {isDeptHead && (
              <div
                className={`sidebar-item ${activeView === 'my-department' ? 'active' : ''}`}
                onClick={() => router.push('/employee-profile?view=my-department')}
              >
                <Users size={20} />
                My Department
              </div>
            )}

            {isRecruiter && (
              <div
                className={`sidebar-item ${activeView === 'create-candidate' ? 'active' : ''}`}
                onClick={() => router.push('/employee-profile?view=create-candidate')}
              >
                <UserPlus size={20} />
                Create Candidate
              </div>
            )}
            {isHR && (
              <div
                className={`sidebar-item ${activeView === 'change-requests' ? 'active' : ''}`}
                onClick={() => router.push('/employee-profile?view=change-requests')}
              >
                <FileText size={20} />
                Change Requests
              </div>
            )}

            {!isHR && !isSystemAdmin && (
              <div
                className={`sidebar-item ${activeView === 'my-change-requests' ? 'active' : ''}`}
                onClick={() => router.push('/employee-profile?view=my-change-requests')}
              >
                <Clock size={20} />
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Dashboard Overview</h2>
                <button
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                  onClick={() => window.location.reload()}
                  title="Refresh Dashboard"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {isHR && (
                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.75rem' }}>
                    <div style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-600)', padding: '1rem', borderRadius: '1rem' }}>
                      <Users size={28} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Employees</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>{employees.length}</div>
                    </div>
                  </div>
                )}

                {isDeptHead && (
                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.75rem' }}>
                    <div style={{ backgroundColor: 'var(--primary-100)', color: 'var(--primary-600)', padding: '1rem', borderRadius: '1rem' }}>
                      <Users size={28} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>My Team</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>{myTeam.length}</div>
                    </div>
                  </div>
                )}

                {isHR && (
                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.75rem' }}>
                    <div style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '1rem', borderRadius: '1rem' }}>
                      <Clock size={28} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Pending Requests</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {changeRequests.filter(r => r.status === 'PENDING').length}
                      </div>
                    </div>
                  </div>
                )}

                {isHR && (
                  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.75rem' }}>
                    <div style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '1rem', borderRadius: '1rem' }}>
                      <CheckCircle size={28} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Approved Requests</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {changeRequests.filter(r => r.status === 'APPROVED').length}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <User size={20} />
                  Professional Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '0.75rem', backgroundColor: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Department</div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{myProfile?.primaryDepartmentId?.name || 'Unassigned'}</div>
                  </div>
                  <div style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '0.75rem', backgroundColor: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Position</div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{myProfile?.primaryPositionId?.title || 'Unassigned'}</div>
                  </div>
                  <div style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '0.75rem', backgroundColor: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.025em' }}>Employment status</div>
                    <div>
                      <span className={`badge badge-${myProfile?.status?.toLowerCase() || 'active'}`} style={{ fontSize: '0.875rem' }}>
                        {myProfile?.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={20} />
                  Quick Actions
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '1.25rem',
                  marginTop: '1.5rem'
                }}>
                  {/* Common Actions */}
                  <button className="card" onClick={() => router.push(`/employee-profile?view=my-profile`)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-light)' }}>
                    <div style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', padding: '1rem', borderRadius: '50%' }}>
                      <User size={24} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>My Profile</span>
                  </button>

                  <button className="card" onClick={() => { router.push('/employee-profile?view=my-profile'); setTimeout(() => document.getElementById('update-profile')?.scrollIntoView({ behavior: 'smooth' }), 300); }} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', padding: '1rem', borderRadius: '50%' }}>
                      <RefreshCw size={24} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Update Contact</span>
                  </button>

                  {!isHR && (
                    <button className="card" onClick={() => router.push('/employee-profile?view=my-change-requests')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', padding: '1rem', borderRadius: '50%' }}>
                        <Clock size={24} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>My Requests</span>
                    </button>
                  )}

                  <button className="card" onClick={() => router.push('/leaves')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', padding: '1rem', borderRadius: '50%' }}>
                      <FileText size={24} />
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Request Leave</span>
                  </button>

                  {/* Admin Only Actions */}
                  {(isHR || isHREmployee || isSystemAdmin) && (
                    <button className="card" onClick={() => router.push('/employee-profile?view=send-notification')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-light)' }}>
                      <div style={{ backgroundColor: '#fff7ed', color: '#ea580c', padding: '1rem', borderRadius: '50%' }}>
                        <Send size={24} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <h4 style={{ margin: 0, color: 'var(--slate-900)', fontSize: '0.95rem' }}>Send Notif</h4>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--slate-500)', fontSize: '0.75rem' }}>Direct Message</p>
                      </div>
                    </button>
                  )}

                  {/* System Admin Direct Creation */}
                  {isSystemAdmin && (
                    <>
                      <button className="card" onClick={() => router.push('/organization-structure/positions/create')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-light)' }}>
                        <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '1rem', borderRadius: '50%' }}>
                          <Briefcase size={24} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <h4 style={{ margin: 0, color: 'var(--slate-900)', fontSize: '0.95rem' }}>New Position</h4>
                          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--slate-500)', fontSize: '0.75rem' }}>Direct Create</p>
                        </div>
                      </button>

                      <button className="card" onClick={() => router.push('/organization-structure/departments/create')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-light)' }}>
                        <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '1rem', borderRadius: '50%' }}>
                          <Network size={24} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <h4 style={{ margin: 0, color: 'var(--slate-900)', fontSize: '0.95rem' }}>New Dept</h4>
                          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--slate-500)', fontSize: '0.75rem' }}>Direct Create</p>
                        </div>
                      </button>
                    </>
                  )}

                  {/* Leadership Change Requests (Managerial roles) */}
                  {(isHR || isHREmployee || isDeptHead || isSystemAdmin) && (
                    <>
                      <button className="card" onClick={() => router.push('/organization-structure/requests/PositionChange')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-light)' }}>
                        <div style={{ backgroundColor: '#faf5ff', color: '#7c3aed', padding: '1rem', borderRadius: '50%' }}>
                          <Briefcase size={24} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <h4 style={{ margin: 0, color: 'var(--slate-900)', fontSize: '0.95rem' }}>Pos Change</h4>
                          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--slate-500)', fontSize: '0.75rem' }}>Request Form</p>
                        </div>
                      </button>

                      <button className="card" onClick={() => router.push('/organization-structure/requests/departmentChange')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-light)' }}>
                        <div style={{ backgroundColor: '#fdf2f8', color: '#db2777', padding: '1rem', borderRadius: '50%' }}>
                          <Network size={24} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <h4 style={{ margin: 0, color: 'var(--slate-900)', fontSize: '0.95rem' }}>Dept Change</h4>
                          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--slate-500)', fontSize: '0.75rem' }}>Request Form</p>
                        </div>
                      </button>
                    </>
                  )}
                  {(isRecruiter) && (
                    <button className="card" onClick={() => router.push('/employee-profile?view=create-candidate')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', border: '1px solid var(--border-light)' }}>
                      <div style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', padding: '1rem', borderRadius: '50%' }}>
                        <UserPlus size={24} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Create Candidate</span>
                    </button>
                  )}

                  {/* Management/HR Directory access */}
                  {(isHR || isHREmployee || isSystemAdmin) && (
                    <button className="card" onClick={() => router.push('/employee-profile?view=employees')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', padding: '1rem', borderRadius: '50%' }}>
                        <Users size={24} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Directory</span>
                    </button>
                  )}

                  {isDeptHead && (
                    <button className="card" onClick={() => router.push('/employee-profile?view=my-department')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', padding: '1rem', borderRadius: '50%' }}>
                        <Users size={24} />
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>My Department</span>
                    </button>
                  )}
                </div>
              </div>

              {isDeptHead && (
                <div className="card" style={{ marginTop: '2rem' }}>
                  <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={20} />
                    My Team members
                  </h3>
                  {myTeam.length > 0 ? (
                    <div className="table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Employee #</th>
                            <th>Name</th>
                            <th>Position</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myTeam.map(emp => (
                            <tr key={emp._id}>
                              <td><span style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{emp.employeeNumber}</span></td>
                              <td style={{ fontWeight: 500 }}>{emp.firstName} {emp.lastName}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{emp.primaryPositionId?.title || 'N/A'}</td>
                              <td>
                                <span className={`badge badge-${emp.status?.toLowerCase() || 'active'}`}>
                                  {emp.status || 'ACTIVE'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button
                                    className="btn-secondary"
                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '0.5rem' }}
                                    onClick={() => goToEmployeeDetails(emp._id)}
                                  >
                                    View Details
                                  </button>
                                  <button
                                    className="btn-secondary"
                                    title="View Hierarchy"
                                    style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => router.push(`/organization-structure/hierarchy?id=${emp._id}`)}
                                  >
                                    <Network size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                      <Users size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                      <p>No team members found in your department.</p>
                      <p style={{ fontSize: '0.875rem' }}>Ensure employees are assigned to your department to see them here.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* My Profile */}
          {activeView === 'my-profile' && myProfile && (
            <div className="animate-fade-in">
              {/* Profile Hero Section */}
              <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ height: '160px', background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%)', position: 'relative' }}>
                  <div style={{ position: 'absolute', bottom: '-60px', left: '2rem', display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
                    <div style={{ padding: '4px', backgroundColor: 'white', borderRadius: '1rem', boxShadow: 'var(--shadow-md)' }}>
                      {myProfile.profilePictureUrl ? (
                        <img
                          src={myProfile.profilePictureUrl}
                          alt="Profile"
                          style={{ width: '140px', height: '140px', objectFit: 'cover', borderRadius: '0.75rem' }}
                        />
                      ) : (
                        <div style={{ width: '140px', height: '140px', backgroundColor: 'var(--primary-100)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.75rem' }}>
                          <User size={64} />
                        </div>
                      )}
                    </div>
                    <div style={{ paddingBottom: '1rem' }}>
                      <h2 style={{ margin: 0, color: 'var(--slate-900)', fontSize: '1.75rem', fontWeight: 800 }}>{myProfile.firstName} {myProfile.lastName}</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                        <span className="badge badge-active" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>{myProfile.status || 'ACTIVE'}</span>
                        <span style={{ color: 'var(--slate-500)', fontSize: '0.875rem', fontWeight: 500 }}>ID: {myProfile.employeeNumber}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ height: '80px', backgroundColor: 'white' }}></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                {/* Employment Details */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--primary-500)' }}><Briefcase size={20} /></div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>Employment Information</h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Department</label>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{myProfile.primaryDepartmentId?.name || 'N/A'}</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Position</label>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{myProfile.primaryPositionId?.title || 'N/A'}</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Work Email</label>
                      <div style={{ color: 'var(--primary-600)', fontWeight: 500 }}>{myProfile.workEmail || 'N/A'}</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Hire Date</label>
                      <div style={{ fontWeight: 500 }}>{myProfile.dateOfHire ? new Date(myProfile.dateOfHire).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Account Roles */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--primary-500)' }}><Shield size={20} /></div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>System Roles</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {roles.length > 0 ? roles.map(r => (
                      <span key={r} className="badge badge-pending" style={{ fontSize: '0.7rem', fontWeight: 600 }}>{r}</span>
                    )) : (
                      <span style={{ color: 'var(--slate-400)', fontSize: '0.875rem' }}>No system roles assigned</span>
                    )}
                  </div>
                </div>

                {/* Contact & Personal */}
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--primary-500)' }}><User size={20} /></div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>Personal & Contact</h3>
                  </div>
                  <div style={{ display: 'grid', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Marital Status</label>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{myProfile.maritalStatus || 'N/A'}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Gender</label>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{myProfile.gender || 'N/A'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Date of Birth</label>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{myProfile.dateOfBirth ? new Date(myProfile.dateOfBirth).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>National ID</label>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{myProfile.nationalId || 'N/A'}</div>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Personal Email</label>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{myProfile.personalEmail || <span style={{ color: '#ef4444' }}>N/A</span>}</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Street Address</label>
                      <div style={{ fontSize: '0.875rem' }}>{myProfile.address?.streetAddress || <span style={{ color: '#ef4444' }}>N/A</span>}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>City</label>
                        <div style={{ fontSize: '0.875rem' }}>{myProfile.address?.city || <span style={{ color: '#ef4444' }}>N/A</span>}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.125rem' }}>Country</label>
                        <div style={{ fontSize: '0.875rem' }}>{myProfile.address?.country || <span style={{ color: '#ef4444' }}>N/A</span>}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Biography */}
                <div className="card" style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--primary-500)' }}><FileText size={20} /></div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>Biography</h3>
                  </div>
                  <p style={{ color: 'var(--slate-600)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                    {myProfile.biography || 'No biography provided yet. You can update it below.'}
                  </p>
                </div>
              </div>

              <div className="card" id="update-profile">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div style={{ color: 'var(--primary-500)' }}><RefreshCw size={20} /></div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>Update Profile (Immediate)</h3>
                </div>
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
              {!isHR && !isSystemAdmin && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--primary-500)' }}><FileText size={20} /></div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>Request Profile Changes</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    Submit a request for critical profile changes that require HR approval.
                  </p>

                  {crSuccess && <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: '0.5rem' }}>{crSuccess}</div>}
                  {crError && <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '0.5rem' }}>{crError}</div>}
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
              {!isHR && !isSystemAdmin && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ color: 'var(--primary-500)' }}><Shield size={20} /></div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)' }}>Legal Name / Marital Status Change Request</h3>
                  </div>
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
          {/* Employee List (HR/Admin Only) */}
          {activeView === 'employees' && (isHR || isHREmployee || isSystemAdmin) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
                  {isDeptHead ? 'My Team Members' : 'All Employees'}
                </h2>
                <div style={{ position: 'relative', width: '320px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                  <input
                    className="form-input"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '2.75rem', borderRadius: '0.75rem' }}
                  />
                </div>
              </div>

              {/* ACTIVE EMPLOYEES TABLE */}
              <div className="table-container" style={{ marginBottom: '2.5rem' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ color: 'var(--slate-800)', fontSize: '1.1rem', fontWeight: 700 }}>Active Employees</h3>
                  <span style={{ fontSize: '0.875rem', color: 'var(--slate-500)', fontWeight: 500 }}>
                    Total: {filteredEmployees.filter(emp => emp.status === EmployeeStatus.ACTIVE || !emp.status).length}
                  </span>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee #</th>
                      <th>Name</th>
                      <th>Work Email</th>
                      <th onClick={() => requestSort('department')} style={{ cursor: 'pointer' }}>Department <ArrowUpDown size={12} style={{ marginLeft: '4px' }} /></th>
                      <th>Position</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData(filteredEmployees)
                      .filter(emp => emp.status === EmployeeStatus.ACTIVE || !emp.status)
                      .map(emp => (
                        <tr key={emp._id}>
                          <td><span style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{emp.employeeNumber}</span></td>
                          <td style={{ fontWeight: 500 }}>{emp.firstName} {emp.lastName}</td>
                          <td style={{ color: 'var(--slate-600)' }}>{emp.workEmail}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-500)' }}></div>
                              {emp.primaryDepartmentId?.name || <span style={{ color: '#ef4444' }}>N/A</span>}
                            </div>
                          </td>
                          <td style={{ color: 'var(--slate-600)' }}>{emp.primaryPositionId?.title || <span style={{ color: '#ef4444' }}>N/A</span>}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                className="btn-secondary"
                                style={{ padding: '0.4rem 0.875rem', fontSize: '0.75rem', borderRadius: '0.5rem' }}
                                onClick={() => goToEmployeeDetails(emp._id)}
                              >
                                View Profile
                              </button>
                              <button
                                className="btn-secondary"
                                title="View Hierarchy"
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => router.push(`/organization-structure/hierarchy?id=${emp._id}`)}
                              >
                                <Network size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* INACTIVE EMPLOYEES TABLE */}
              {isHR && (
                <div className="table-container">
                  <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                    <h3 style={{ color: 'var(--slate-800)', fontSize: '1.1rem', fontWeight: 700 }}>Inactive / Terminated Employees</h3>
                  </div>
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
                      {getSortedData(filteredEmployees)
                        .filter(emp => emp.status && emp.status !== EmployeeStatus.ACTIVE)
                        .map(emp => (
                          <tr key={emp._id}>
                            <td><span style={{ fontWeight: 600, color: 'var(--slate-500)' }}>{emp.employeeNumber}</span></td>
                            <td style={{ fontWeight: 500 }}>{emp.firstName} {emp.lastName}</td>
                            <td style={{ color: 'var(--slate-600)' }}>{emp.workEmail}</td>
                            <td>
                              <span className={`badge badge-${emp.status?.toLowerCase()}`}>
                                {emp.status}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '0.4rem 0.875rem', fontSize: '0.75rem', borderRadius: '0.5rem' }}
                                  onClick={() => goToEmployeeDetails(emp._id)}
                                >
                                  View Profile
                                </button>
                                <button
                                  className="btn-secondary"
                                  title="View Hierarchy"
                                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onClick={() => router.push(`/organization-structure/hierarchy?id=${emp._id}`)}
                                >
                                  <Network size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {filteredEmployees.filter(emp => emp.status && emp.status !== EmployeeStatus.ACTIVE).length === 0 && (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                      <Users size={32} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                      <p>No inactive employees found.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* My Department View (Department Head Only) */}
          {activeView === 'my-department' && isDeptHead && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
                  My Department Employees
                </h2>
                <div style={{ position: 'relative', width: '300px' }}>
                  <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    className="form-input"
                    placeholder="Search in department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
              </div>

              <div className="card">
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: 'var(--text-secondary)', margin: 0 }}>Active Team Members</h3>
                  <button
                    className="btn-secondary"
                    onClick={loadMyTeam}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                  >
                    <RefreshCw size={14} /> Refresh Team
                  </button>
                </div>

                {!myProfile?.primaryDepartmentId ? (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-tertiary)' }}>
                    <Users size={48} style={{ marginBottom: '1rem', opacity: 0.15 }} />
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Department Not Assigned</h4>
                    <p>You have not been assigned to a department yet. Please contact HR to set your department so you can see your team.</p>
                  </div>
                ) : myTeam.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Employee #</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Position</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedData(myTeam)
                          .filter(emp =>
                            (emp.firstName + ' ' + emp.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
                            emp.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map(emp => (
                            <tr key={emp._id}>
                              <td>{emp.employeeNumber}</td>
                              <td>{emp.firstName} {emp.lastName}</td>
                              <td>{emp.workEmail}</td>
                              <td>{emp.primaryPositionId?.title || <span style={{ color: '#ef4444' }}>N/A</span>}</td>
                              <td>
                                <span className="badge badge-active">ACTIVE</span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                  <button
                                    className="btn-secondary"
                                    style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                                    onClick={() => goToEmployeeDetails(emp._id)}
                                  >
                                    View Details
                                  </button>
                                  <button
                                    className="btn-secondary"
                                    title="View Hierarchy"
                                    style={{ padding: '0.4rem 0.5rem', fontSize: '0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    onClick={() => router.push(`/organization-structure/hierarchy?id=${emp._id}`)}
                                  >
                                    <Network size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-tertiary)' }}>
                    <Users size={48} style={{ marginBottom: '1rem', opacity: 0.15 }} />
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No active team members found</h4>
                    <p>Your department is <strong>{myProfile.primaryDepartmentId.name}</strong>, but no other active employees are currently assigned to it.</p>
                  </div>
                )}
              </div>
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
          {/* Send Notification View */}
          {activeView === 'send-notification' && (isHR || isHREmployee || isSystemAdmin) && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Send Employee Notification</h2>
                <button className="btn-secondary" onClick={() => router.push('/employee-profile')}>
                  Back to Overview
                </button>
              </div>

              <div className="card">
                <form onSubmit={handleSendNotification}>
                  <div className="form-group">
                    <label className="form-label">Search & Select Recipient *</label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                          <input
                            type="text"
                            className="form-input"
                            style={{ paddingLeft: '2.5rem' }}
                            placeholder="Search by name or number..."
                            value={recipientSearch}
                            onChange={(e) => setRecipientSearch(e.target.value)}
                          />
                        </div>
                      </div>

                      <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        border: '1px solid var(--border-light)',
                        borderRadius: '0.75rem',
                        backgroundColor: 'var(--slate-50)',
                        marginBottom: '1rem'
                      }}>
                        {employees
                          .filter(emp =>
                            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(recipientSearch.toLowerCase()) ||
                            emp.employeeNumber.toLowerCase().includes(recipientSearch.toLowerCase())
                          )
                          .map(emp => (
                            <div
                              key={emp._id}
                              style={{
                                padding: '0.75rem 1rem',
                                borderBottom: '1px solid var(--border-light)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                backgroundColor: notificationForm.targetEmployeeId === emp._id ? 'var(--primary-50)' : 'transparent'
                              }}
                              onClick={() => {
                                setNotificationForm({ ...notificationForm, targetEmployeeId: emp._id });
                                setRecipientSearch(`${emp.firstName} ${emp.lastName}`);
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '0.875rem' }}>
                                  {emp.firstName} {emp.lastName}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                                  {emp.employeeNumber} • {emp.primaryDepartmentId?.name || 'No Dept'}
                                </div>
                              </div>
                              {notificationForm.targetEmployeeId === emp._id && (
                                <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                              )}
                            </div>
                          ))
                        }
                        {employees.filter(emp =>
                          `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(recipientSearch.toLowerCase()) ||
                          emp.employeeNumber.toLowerCase().includes(recipientSearch.toLowerCase())
                        ).length === 0 && (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--slate-400)', fontSize: '0.875rem' }}>
                              No employees found matching "{recipientSearch}"
                            </div>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message *</label>
                    <textarea
                      className="form-input"
                      rows={4}
                      required
                      placeholder="Type your notification message here..."
                      value={notificationForm.message}
                      onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                    />
                  </div>

                  {/* Preview Section */}
                  <div style={{
                    marginTop: '1.5rem',
                    padding: '1rem',
                    backgroundColor: 'var(--slate-50)',
                    borderRadius: '0.75rem',
                    border: '1px dashed var(--slate-300)'
                  }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Message Preview
                    </label>
                    <div style={{
                      fontSize: '0.9rem',
                      color: 'var(--slate-700)',
                      lineHeight: '1.5',
                      fontStyle: notificationForm.message ? 'normal' : 'italic'
                    }}>
                      {myProfile ? `${myProfile.firstName} ${myProfile.lastName}: ` : 'You: '}
                      {notificationForm.message || 'Start typing to see preview...'}
                    </div>
                  </div>

                  {notifError && <div className="alert alert-error">{notifError}</div>}
                  {notifSuccess && <div className="alert alert-success">{notifSuccess}</div>}

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isSendingNotif || !notificationForm.targetEmployeeId}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: !notificationForm.targetEmployeeId ? 0.6 : 1
                      }}
                    >
                      <Send size={18} />
                      {isSendingNotif ? 'Sending...' : 'Send Notification'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setNotificationForm({ targetEmployeeId: '', message: '' });
                        setRecipientSearch('');
                      }}
                    >
                      Reset Form
                    </button>
                  </div>
                </form>
              </div>

              <div className="card" style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--slate-800)' }}>Quick Select Recipient</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '1rem' }}>
                  Frequently used or recent employees.
                </p>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Department</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.slice(0, 5).map(emp => (
                        <tr key={emp._id}>
                          <td>{emp.firstName} {emp.lastName}</td>
                          <td>{emp.primaryDepartmentId?.name || <span style={{ color: '#ef4444' }}>N/A</span>}</td>
                          <td>
                            <button
                              className="btn-secondary"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => setNotificationForm({ ...notificationForm, targetEmployeeId: emp._id })}
                            >
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Create Candidate */}
          {activeView === 'create-candidate' && hasRole('Recruiter') && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Add New Candidate</h2>
                <button className="btn-secondary" onClick={() => router.push('/employee-profile')}>
                  Back to Overview
                </button>
              </div>
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
              <div className="table-container">
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  <h3 style={{ color: 'var(--slate-800)', fontSize: '1.1rem', fontWeight: 700 }}>Profile Change Requests</h3>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Employee</th>
                      <th>Description</th>
                      <th
                        onClick={() => requestSort('status')}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        Status <ArrowUpDown size={14} />
                      </th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData(changeRequests).map(req => (
                      <tr key={req.requestId}>
                        <td><span style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{req.requestId}</span></td>
                        <td style={{ fontWeight: 500 }}>
                          {req.employeeProfileId?.firstName} {req.employeeProfileId?.lastName}
                        </td>
                        <td style={{ color: 'var(--slate-600)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.requestDescription}</td>
                        <td><StatusBadge status={req.status} /></td>
                        <td style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>{new Date(req.submittedAt).toLocaleDateString()}</td>
                        <td>
                          {req.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                className="btn-primary"
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', backgroundColor: 'var(--success)', borderRadius: '0.5rem' }}
                                onClick={() => reviewChangeRequest(req.requestId, 'APPROVED')}
                              >
                                Approve
                              </button>
                              <button
                                className="btn-primary"
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', backgroundColor: 'var(--error)', borderRadius: '0.5rem' }}
                                onClick={() => reviewChangeRequest(req.requestId, 'REJECTED')}
                              >
                                Reject
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', border: 'none', backgroundColor: 'var(--slate-100)', borderRadius: '0.5rem' }}
                                onClick={() => goToDetails(req.requestId)}
                              >
                                Details
                              </button>
                            </div>
                          ) : (
                            <button
                              className="btn-secondary"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '0.5rem' }}
                              onClick={() => goToDetails(req.requestId)}
                            >
                              View Details
                            </button>
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
          {activeView === 'my-change-requests' && !isHR && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>My Profile Change Requests</h2>
              <div className="table-container">
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                  <h3 style={{ color: 'var(--slate-800)', fontSize: '1.1rem', fontWeight: 700 }}>My History</h3>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Request ID</th>
                      <th>Description</th>
                      <th
                        onClick={() => requestSort('status')}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        Status <ArrowUpDown size={14} />
                      </th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedData(myChangeRequests).map(req => (
                      <tr key={req.requestId}>
                        <td><span style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{req.requestId}</span></td>
                        <td style={{ color: 'var(--slate-600)' }}>{req.requestDescription}</td>
                        <td><StatusBadge status={req.status} /></td>
                        <td style={{ color: 'var(--slate-500)', fontSize: '0.75rem' }}>{new Date(req.submittedAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '0.5rem' }}
                              onClick={() => goToDetails(req.requestId)}
                            >
                              Details
                            </button>
                            {req.status === 'PENDING' && (
                              <button
                                className="btn-secondary"
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#fff1f2', color: '#e11d48', border: 'none' }}
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
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--slate-50)' }}>
                <h3 style={{ margin: 0, color: 'var(--slate-900)', fontWeight: 700 }}>Employee Details</h3>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    color: 'var(--slate-400)',
                    padding: '0.25rem'
                  }}
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '2rem' }}>
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'var(--slate-50)' }}>
                    <span style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>Employee ID</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary-600)' }}>{selectedEmployee.employeeNumber}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>Full Name</span>
                    <span style={{ fontWeight: 500 }}>{selectedEmployee.firstName} {selectedEmployee.lastName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>Email Address</span>
                    <span style={{ fontWeight: 500 }}>{selectedEmployee.email}</span>
                  </div>
                  {selectedEmployee.phone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>Phone Number</span>
                      <span style={{ fontWeight: 500 }}>{selectedEmployee.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--slate-50)' }}>
                <button className="btn-secondary" onClick={() => setSelectedEmployee(null)} style={{ padding: '0.625rem 1.5rem' }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }
      {
        /* Cancel Request Modal */
        showCancelModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', margin: '0 1rem' }}>
              <div className="card-header">
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Cancel Request</h3>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-primary)' }}>Are you sure you want to cancel this change request?</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  This action cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowCancelModal(false);
                      setSelectedRequestId(null);
                    }}
                  >
                    No, Keep It
                  </button>
                  <button
                    className="btn-danger"
                    onClick={confirmCancelRequest}
                    style={{
                      backgroundColor: '#ef4444',
                      color: 'white'
                    }}
                  >
                    Yes, Cancel Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {/* Confirmation Modal */}
      {isConfirmationOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Request Approved</h3>
            <p className="text-slate-600 mb-6">Do you want to create a follow-up Organizational Change Request (e.g., Update Department/Position)?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsConfirmationOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-600 font-medium hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsConfirmationOpen(false);
                  setIsOrgModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all transform hover:-translate-y-0.5"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Org Change Request Modal */}
      <OrgChangeRequestModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        initialDescription={orgModalDescription}
        initialEmployeeId={orgModalEmployeeId}
      />
    </div>
  );
};

export default EmployeeProfileDashboard;