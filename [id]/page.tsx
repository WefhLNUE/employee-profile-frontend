'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { api } from '../services/api';
import { UpdateEmployeeAdminForm, ContractType, WorkType, EmployeeStatus, SystemRole } from '../types/employee-profile.types';
import {
  User, Briefcase, Mail, Calendar, MapPin, Phone,
  Shield, FileText, ChevronLeft, CreditCard,
  TrendingUp, Award, Settings, CheckCircle, AlertCircle,
  Users, Camera
} from 'lucide-react';

export default function EmployeeDetailsPage({ tokenFromContext }: { tokenFromContext?: string }) {
  const router = useRouter();
  const params = useParams();

  let employeeId: string | undefined;
  if (params?.id) {
    employeeId = Array.isArray(params.id) ? params.id[0] : params.id;
  }

  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateEmployeeAdminForm>({});

  // Dropdown Data
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [uniquePermissions, setUniquePermissions] = useState<string[]>([]);
  const [newPermission, setNewPermission] = useState('');
  const [myRoles, setMyRoles] = useState<string[]>([]);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'admin'>('overview');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'admin' || tabParam === 'performance' || tabParam === 'overview') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (tokenFromContext) {
      localStorage.setItem('token', tokenFromContext);
    }

    if (!employeeId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setError('No auth token found. Please log in.');
      setLoading(false);
      return;
    }

    setLoading(true);

    Promise.all([
      api.getEmployeeById(employeeId),
      api.getAllDepartments().catch(() => []),
      api.getAllPositions().catch(() => []),
      api.getSupervisors().catch(() => []),
      api.getUniquePermissions().catch(() => []),
      api.getMyRoles().catch(() => []),
    ])
      .then(([employeeData, deptData, posData, supervisorData, permissionsData, rolesData]) => {
        setEmployee(employeeData);
        setDepartments(deptData);
        setPositions(posData);
        setSupervisors(supervisorData);
        setUniquePermissions(permissionsData);
        setMyRoles(rolesData);

        // Initialize edit form with safe defaults
        setEditForm({
          permissions: employeeData.permissions || [],
          roles: employeeData.roles || [],
          primaryPositionId: employeeData.primaryPositionId?._id || employeeData.primaryPositionId,
          primaryDepartmentId: employeeData.primaryDepartmentId?._id || employeeData.primaryDepartmentId,
          supervisorPositionId: employeeData.supervisorPositionId?._id || employeeData.supervisorPositionId,
          payGradeId: employeeData.payGradeId?._id || employeeData.payGradeId,
        });
      })
      .catch((err: any) =>
        setError(err.message || 'Failed to fetch data')
      )
      .finally(() => setLoading(false));

  }, [employeeId, tokenFromContext ?? '']);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!employeeId) return;

    try {
      await api.updateEmployeeAdmin(employeeId, editForm);
      setSuccess('Employee updated successfully');
      const updated = await api.getEmployeeById(employeeId);
      setEmployee(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update employee');
    }
  };

  const handleChange = (field: keyof UpdateEmployeeAdminForm, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !employeeId) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        await api.updateEmployeeAdmin(employeeId, { profilePictureUrl: base64 });
        setSuccess('Profile picture updated');
        const updated = await api.getEmployeeById(employeeId);
        setEmployee(updated);
      } catch (err: any) {
        setError(err.message || 'Failed to update photo');
      }
    };
    reader.readAsDataURL(file);
  };

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [deactivationStatus, setDeactivationStatus] = useState<string>('');

  const handleReactivate = async () => {
    if (!employeeId) return;
    try {
      await api.reactivateEmployee(employeeId);
      setSuccess('Employee reactivated successfully');
      setShowReactivateModal(false);
      const updated = await api.getEmployeeById(employeeId);
      setEmployee(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate employee');
      setShowReactivateModal(false);
    }
  };

  const handleDeactivate = async () => {
    if (!employeeId || !deactivationStatus) return;

    try {
      await api.deactivateEmployee(employeeId, deactivationStatus);
      setSuccess('Employee deactivated successfully');
      setShowDeactivateModal(false);
      const updated = await api.getEmployeeById(employeeId);
      setEmployee(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate employee');
      setShowDeactivateModal(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #ede9fe', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#64748b', fontWeight: 500 }}>Loading employee details...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: '2rem' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
          <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Employee Not Found</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error || "We couldn't find the employee profile you're looking for."}</p>
          <button onClick={() => router.push('/employee-profile?view=employees')} style={{ width: '100%', padding: '0.75rem', backgroundColor: '#7c3aed', color: 'white', borderRadius: '0.5rem', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Back to Directory</button>
        </div>
      </div>
    );
  }

  // Safe data accessors
  const getPositionTitle = () => employee.primaryPositionId?.title || employee.position || 'No Position';
  const getDepartmentName = () => employee.primaryDepartmentId?.name || 'No Department';
  const getPayGrade = () => employee.payGradeId?.grade || 'N/A';
  const getSupervisorName = () => {
    if (employee.supervisorId) return `${employee.supervisorId.firstName} ${employee.supervisorId.lastName}`;
    return 'No Supervisor Assigned';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', zoom: 0.85 }}>
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
          --error: #ef4444;
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --border-light: #e2e8f0;
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --radius-md: 0.75rem;
          --radius-lg: 1rem;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .btn-primary { background-color: var(--primary-600); color: white; border: none; padding: 0.625rem 1.25rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 0.5rem; }
        .btn-primary:hover { background-color: var(--primary-700); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2); }
        .btn-primary:active { transform: translateY(0); }
        .btn-secondary { background-color: white; color: var(--text-primary); border: 1px solid var(--border-light); padding: 0.625rem 1.25rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; gap: 0.5rem; }
        .btn-secondary:hover { background-color: var(--slate-50); border-color: var(--slate-300); }
        .btn-danger { background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 0.625rem 1.25rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-danger:hover { background-color: #fecaca; }
        .btn-success { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; padding: 0.625rem 1.25rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .btn-success:hover { background-color: #a7f3d0; }
        .card { background-color: white; border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 1.5rem; box-shadow: var(--shadow-md); transition: all 0.3s ease; }
        .card:hover { shadow: var(--shadow-lg); border-color: var(--primary-100); }
        .form-label { display: block; color: var(--slate-700); font-weight: 600; margin-bottom: 0.5rem; font-size: 0.875rem; }
        .form-input { width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border-light); border-radius: var(--radius-md); font-size: 0.875rem; color: var(--text-primary); transition: all 0.2s; }
        .form-input:focus { outline: none; border-color: var(--primary-500); box-shadow: 0 0 0 3px var(--primary-50); }
        .badge { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; }
        .tab-btn { padding: 0.75rem 1.5rem; border: none; background: none; color: var(--slate-500); font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s ease; }
        .tab-btn.active { color: var(--primary-600); border-bottom-color: var(--primary-600); }
        .info-label { font-size: 0.75rem; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 0.25rem; display: block; }
        .info-value { font-size: 1rem; font-weight: 600; color: var(--slate-900); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease forwards; }
      `}</style>

      {/* Hero Section */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid var(--border-light)', marginBottom: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem' }}>
          <button onClick={() => router.push('/employee-profile?view=employees')} className="btn-secondary" style={{ marginBottom: '1.5rem', border: 'none', padding: '0.5rem 0' }}>
            <ChevronLeft size={20} /> Back to Directory
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2rem', marginBottom: '2rem' }}>
            <div
              className="profile-image-container"
              style={{ padding: '4px', backgroundColor: 'white', borderRadius: '1.25rem', boxShadow: 'var(--shadow-lg)', position: 'relative', cursor: 'pointer' }}
              onClick={() => document.getElementById('hero-photo-upload')?.click()}
            >
              {employee.profilePictureUrl ? (
                <img src={employee.profilePictureUrl} alt="Profile" style={{ width: '120px', height: '120px', borderRadius: '1rem', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '120px', height: '120px', borderRadius: '1rem', backgroundColor: 'var(--primary-100)', color: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={64} />
                </div>
              )}
              <div className="upload-overlay" style={{ position: 'absolute', inset: '4px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                <Camera color="white" size={32} />
              </div>
              <input
                id="hero-photo-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handlePhotoUpload}
              />
            </div>
            <style>{`
              .profile-image-container:hover .upload-overlay { opacity: 1 !important; }
            `}</style>
            <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)' }}>{employee.firstName} {employee.lastName}</h1>
                <span className={`badge`} style={{
                  backgroundColor: employee.status === 'ACTIVE' ? '#ecfdf5' : employee.status === 'SUSPENDED' ? '#fef2f2' : '#f3f4f6',
                  color: employee.status === 'ACTIVE' ? '#047857' : employee.status === 'SUSPENDED' ? '#b91c1c' : '#475569'
                }}>{employee.status || 'ACTIVE'}</span>
              </div>
              <div style={{ display: 'flex', gap: '2rem', color: 'var(--slate-500)', fontSize: '0.95rem', fontWeight: 500 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Briefcase size={18} />{getPositionTitle()}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={18} />{getDepartmentName()}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CreditCard size={18} />ID: {employee.employeeNumber}</div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>Performance</button>
            {myRoles.some(r => [SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN].includes(r as any)) && (
              <button className={`tab-btn ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>Admin Edit</button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 4rem 2rem' }}>
        {error && <div className="animate-fade-in" style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><AlertCircle size={20} />{error}</div>}
        {success && <div className="animate-fade-in" style={{ padding: '1rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '0.75rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CheckCircle size={20} />{success}</div>}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Briefcase size={20} color="var(--primary-500)" />
                Employment Information
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
                <div className="info-row" style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', padding: '1.25rem', backgroundColor: 'var(--primary-50)', borderRadius: '1rem', border: '1px solid var(--primary-100)' }}>
                  <div>
                    <span className="info-label">Position</span>
                    <span className="info-value" style={{ color: 'var(--primary-700)' }}>{getPositionTitle()}</span>
                  </div>
                  <div>
                    <span className="info-label">Department</span>
                    <span className="info-value">{getDepartmentName()}</span>
                  </div>
                  <div>
                    <span className="info-label">Supervisor Position</span>
                    <span className="info-value">{employee.supervisorPositionId?.title || 'N/A'}</span>
                  </div>
                </div>
                <div className="info-row"><span className="info-label">Hire Date</span><span className="info-value">{employee.dateOfHire ? new Date(employee.dateOfHire).toLocaleDateString() : 'N/A'}</span></div>
                <div className="info-row"><span className="info-label">Pay Grade</span><span className="info-value">{getPayGrade()}</span></div>
                <div className="info-row"><span className="info-label">Contract Type</span><span className="info-value">{employee.contractType || 'N/A'}</span></div>
                <div className="info-row"><span className="info-label">Work Type</span><span className="info-value">{employee.workType || 'N/A'}</span></div>
                {/* <div className="info-row" style={{ gridColumn: 'span 2' }}>
                  <span className="info-label">Immediate Supervisor</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-600)' }}>
                      <User size={20} />
                    </div>
                    <div>
                      <span className="info-value" style={{ display: 'block' }}>{getSupervisorName()}</span>
                    </div>
                  </div>
                </div> */}
                <div className="info-row"><span className="info-label">Status Effective</span><span className="info-value">{employee.statusEffectiveFrom ? new Date(employee.statusEffectiveFrom).toLocaleDateString() : 'N/A'}</span></div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Shield size={20} color="var(--primary-500)" />
                System Roles
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {employee.roles?.map((r: string) => (
                  <span key={r} style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-700)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>{r}</span>
                )) || <span style={{ color: 'var(--slate-400)' }}>No roles assigned</span>}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Mail size={20} color="var(--primary-500)" />
                Contact Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="info-row"><span className="info-label">Work Email</span><span className="info-value" style={{ color: 'var(--primary-600)' }}>{employee.workEmail}</span></div>
                <div className="info-row"><span className="info-label">Personal Email</span><span className="info-value">{employee.personalEmail || 'N/A'}</span></div>
                <div className="info-row"><span className="info-label">Mobile Phone</span><span className="info-value">{employee.mobilePhone || 'N/A'}</span></div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MapPin size={20} color="var(--primary-500)" />
                Home Address
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="info-row"><span className="info-label">Street</span><span className="info-value">{employee.address?.streetAddress || 'N/A'}</span></div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="info-row" style={{ flex: 1 }}><span className="info-label">City</span><span className="info-value">{employee.address?.city || 'N/A'}</span></div>
                  <div className="info-row" style={{ flex: 1 }}><span className="info-label">Country</span><span className="info-value">{employee.address?.country || 'N/A'}</span></div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={20} color="var(--primary-500)" />
                Biography
              </h3>
              <p style={{ color: 'var(--slate-600)', lineHeight: 1.6, fontSize: '0.95rem' }}>{employee.biography || 'No biography provided.'}</p>
            </div>
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            <div className="card" style={{ gridColumn: 'span 2' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Award size={20} color="var(--primary-500)" />
                Latest Appraisal
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
                <div className="info-row"><span className="info-label">Score</span><span className="info-value" style={{ fontSize: '1.5rem', color: 'var(--primary-600)' }}>{employee.lastAppraisalScore ?? 'N/A'}</span></div>
                <div className="info-row"><span className="info-label">Rating</span><span className="info-value">{employee.lastAppraisalRatingLabel || 'N/A'}</span></div>
                <div className="info-row"><span className="info-label">Date</span><span className="info-value">{employee.lastAppraisalDate ? new Date(employee.lastAppraisalDate).toLocaleDateString() : 'N/A'}</span></div>
              </div>
              <div className="info-row" style={{ marginTop: '2rem' }}>
                <span className="info-label">Development Plan Summary</span>
                <p style={{ color: 'var(--slate-600)', lineHeight: 1.6, marginTop: '0.5rem' }}>{employee.lastDevelopmentPlanSummary || 'No development plan summary available.'}</p>
              </div>
            </div>
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <TrendingUp size={20} color="var(--primary-500)" />
                Metrics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div><span className="info-label">Scale Type</span><div style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{employee.lastAppraisalScaleType || 'N/A'}</div></div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Edit Tab */}
        {activeTab === 'admin' && (
          <div className="animate-fade-in">
            <div className="card" style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Settings size={24} color="var(--primary-500)" />
                  Administrative Controls
                </h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {myRoles.some(r => [SystemRole.HR_ADMIN, 'HR_ADMIN'].includes(r)) && (employee.status === EmployeeStatus.ACTIVE || !employee.status) && (
                    <button type="button" className="btn-danger" onClick={() => setShowDeactivateModal(true)}>Deactivate Profile</button>
                  )}
                  {myRoles.some(r => [SystemRole.HR_ADMIN, 'HR_ADMIN'].includes(r)) && (employee.status && employee.status !== EmployeeStatus.ACTIVE) && (
                    <button type="button" className="btn-success" onClick={() => setShowReactivateModal(true)}>Reactivate Profile</button>
                  )}
                </div>
              </div>

              <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '2.5rem' }}>
                {/* Section 1: Personal Details */}
                <section>
                  <h4 style={{ fontSize: '1rem', color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--primary-100)', paddingBottom: '0.5rem' }}>Personal Information</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div><label className="form-label">First Name</label><input type="text" className="form-input" defaultValue={employee.firstName} onChange={e => handleChange('firstName', e.target.value)} /></div>
                    <div><label className="form-label">Last Name</label><input type="text" className="form-input" defaultValue={employee.lastName} onChange={e => handleChange('lastName', e.target.value)} /></div>
                    <div><label className="form-label">Date of Birth</label><input type="date" className="form-input" defaultValue={employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : ''} onChange={e => handleChange('dateOfBirth', e.target.value)} /></div>
                    <div><label className="form-label">National ID</label><input type="text" className="form-input" defaultValue={employee.nationalId} onChange={e => handleChange('nationalId', e.target.value)} /></div>
                    <div>
                      <label className="form-label">Marital Status</label>
                      <select className="form-input" defaultValue={employee.maritalStatus || ""} onChange={e => handleChange('maritalStatus', e.target.value)}>
                        <option value="">Select...</option>
                        <option value="SINGLE">Single</option>
                        <option value="MARRIED">Married</option>
                        <option value="DIVORCED">Divorced</option>
                        <option value="WIDOWED">Widowed</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* Section 2: Contact & Address */}
                <section>
                  <h4 style={{ fontSize: '1rem', color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--primary-100)', paddingBottom: '0.5rem' }}>Contact & Address</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div><label className="form-label">Work Email</label><input type="email" className="form-input" defaultValue={employee.workEmail} onChange={e => handleChange('workEmail', e.target.value)} /></div>
                    <div><label className="form-label">Personal Email</label><input type="email" className="form-input" defaultValue={employee.personalEmail} onChange={e => handleChange('personalEmail', e.target.value)} /></div>
                    <div><label className="form-label">Mobile Phone</label><input type="tel" className="form-input" defaultValue={employee.mobilePhone} onChange={e => handleChange('mobilePhone', e.target.value)} /></div>
                    <div><label className="form-label">Home Phone</label><input type="tel" className="form-input" defaultValue={employee.homePhone} onChange={e => handleChange('homePhone', e.target.value)} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label className="form-label">Street Address</label><input type="text" className="form-input" defaultValue={employee.address?.streetAddress} onChange={e => handleChange('streetAddress', e.target.value)} /></div>
                    <div><label className="form-label">City</label><input type="text" className="form-input" defaultValue={employee.address?.city} onChange={e => handleChange('city', e.target.value)} /></div>
                    <div><label className="form-label">Country</label><input type="text" className="form-input" defaultValue={employee.address?.country} onChange={e => handleChange('country', e.target.value)} /></div>
                  </div>
                </section>

                {/* Section 3: Banking & Professional */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                  <section>
                    <h4 style={{ fontSize: '1rem', color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--primary-100)', paddingBottom: '0.5rem' }}>Banking Information</h4>
                    <div style={{ display: 'grid', gap: '1.25rem' }}>
                      <div><label className="form-label">Bank Name</label><input type="text" className="form-input" defaultValue={employee.bankName} onChange={e => handleChange('bankName', e.target.value)} /></div>
                      <div><label className="form-label">Bank Account Number</label><input type="text" className="form-input" defaultValue={employee.bankAccountNumber} onChange={e => handleChange('bankAccountNumber', e.target.value)} /></div>
                    </div>
                  </section>
                  <section>
                    <h4 style={{ fontSize: '1rem', color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--primary-100)', paddingBottom: '0.5rem' }}>Professional Profile</h4>
                    <div style={{ display: 'grid', gap: '1.25rem' }}>
                      <div><label className="form-label">Profile Picture URL</label><input type="url" className="form-input" defaultValue={employee.profilePictureUrl} onChange={e => handleChange('profilePictureUrl', e.target.value)} /></div>
                      <div><label className="form-label">Biography</label><textarea className="form-input" rows={3} defaultValue={employee.biography} onChange={e => handleChange('biography', e.target.value)} /></div>
                    </div>
                  </section>
                </div>

                {/* Section 4: Employment & Contract */}
                <section>
                  <h4 style={{ fontSize: '1rem', color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--primary-100)', paddingBottom: '0.5rem' }}>Employment Configuration</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                      <label className="form-label">Primary Position</label>
                      <select
                        className="form-input"
                        defaultValue={employee.primaryPositionId?._id || employee.primaryPositionId || ""}
                        onChange={e => handleChange('primaryPositionId', e.target.value)}
                      >
                        <option value="">Select Position...</option>
                        {positions.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Primary Department</label>
                      <select
                        className="form-input"
                        defaultValue={employee.primaryDepartmentId?._id || employee.primaryDepartmentId || ""}
                        onChange={e => handleChange('primaryDepartmentId', e.target.value)}
                      >
                        <option value="">Select Department...</option>
                        {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Supervisor Position</label>
                      <select
                        className="form-input"
                        defaultValue={employee.supervisorPositionId?._id || employee.supervisorPositionId || ""}
                        onChange={e => handleChange('supervisorPositionId', e.target.value)}
                      >
                        <option value="">Select Supervisor Position...</option>
                        {positions.map(p => <option key={p._id} value={p._id}>{p.title}</option>)}
                      </select>
                    </div>
                    <div><label className="form-label">Pay Grade (Name)</label><input type="text" className="form-input" placeholder={employee.payGradeId?.grade || "e.g. Grade A"} onChange={e => handleChange('payGradeName', e.target.value)} /></div>
                    <div><label className="form-label">Hire Date</label><input type="date" className="form-input" defaultValue={employee.dateOfHire ? new Date(employee.dateOfHire).toISOString().split('T')[0] : ''} onChange={e => handleChange('dateOfHire', e.target.value)} /></div>
                    <div><label className="form-label">Contract Start</label><input type="date" className="form-input" defaultValue={employee.contractStartDate ? new Date(employee.contractStartDate).toISOString().split('T')[0] : ''} onChange={e => handleChange('contractStartDate', e.target.value)} /></div>
                    <div><label className="form-label">Contract End</label><input type="date" className="form-input" defaultValue={employee.contractEndDate ? new Date(employee.contractEndDate).toISOString().split('T')[0] : ''} onChange={e => handleChange('contractEndDate', e.target.value)} /></div>
                    <div>
                      <label className="form-label">Contract Type</label>
                      <select className="form-input" defaultValue={employee.contractType || ""} onChange={e => handleChange('contractType', e.target.value)}>
                        <option value="">Select...</option>
                        {Object.values(ContractType).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Work Type</label>
                      <select className="form-input" defaultValue={employee.workType || ""} onChange={e => handleChange('workType', e.target.value)}>
                        <option value="">Select...</option>
                        {Object.values(WorkType).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Status</label>
                      <select className="form-input" defaultValue={employee.status || ""} onChange={e => handleChange('status', e.target.value)}>
                        <option value="">Select...</option>
                        {Object.values(EmployeeStatus).map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div><label className="form-label">Status Effective From</label><input type="date" className="form-input" defaultValue={employee.statusEffectiveFrom ? new Date(employee.statusEffectiveFrom).toISOString().split('T')[0] : ''} onChange={e => handleChange('statusEffectiveFrom', e.target.value)} /></div>
                  </div>
                </section>

                {/* Section 5: Access & Permissions */}
                <section>
                  <h4 style={{ fontSize: '1rem', color: 'var(--primary-600)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem', fontWeight: 700, borderBottom: '1px solid var(--primary-100)', paddingBottom: '0.5rem' }}>Access & Permissions</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                      <label className="form-label">System Roles</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <select className="form-input" value="" onChange={(e) => { const val = e.target.value; if (val && !(editForm.roles || []).includes(val)) handleChange('roles', [...(editForm.roles || []), val]); }}>
                          <option value="">Add role...</option>
                          {Object.values(SystemRole).map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {(editForm.roles || []).map((r, i) => (
                          <span key={i} className="badge" style={{ backgroundColor: 'var(--slate-100)', color: 'var(--slate-700)', padding: '0.4rem 0.75rem' }}>
                            {r} <button type="button" onClick={() => handleChange('roles', (editForm.roles || []).filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, marginLeft: '0.5rem' }}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Custom Permissions</label>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <select className="form-input" value="" onChange={(e) => { const val = e.target.value; if (val && !(editForm.permissions || []).includes(val)) handleChange('permissions', [...(editForm.permissions || []), val]); }}>
                          <option value="">Add existing...</option>
                          {uniquePermissions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <input type="text" className="form-input" placeholder="New permission..." value={newPermission} onChange={e => setNewPermission(e.target.value)} onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); if (newPermission && !(editForm.permissions || []).includes(newPermission)) { handleChange('permissions', [...(editForm.permissions || []), newPermission]); setNewPermission(''); } } }} />
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {(editForm.permissions || []).map((p, i) => (
                          <span key={i} className="badge" style={{ backgroundColor: 'var(--primary-50)', color: 'var(--primary-600)', padding: '0.4rem 0.75rem' }}>
                            {p} <button type="button" onClick={() => handleChange('permissions', (editForm.permissions || []).filter((_, idx) => idx !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 800, marginLeft: '0.5rem' }}>×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
                  <button type="submit" className="btn-primary" style={{ padding: '0.875rem 3rem', fontSize: '1rem' }}>Save All Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deactivation Modal */}
        {showDeactivateModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card animate-fade-in" style={{ maxWidth: '450px', width: '100%', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--error)', marginBottom: '1rem' }}>
                <AlertCircle size={32} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Deactivate Employee</h3>
              </div>
              <p style={{ color: 'var(--slate-600)', marginBottom: '1.5rem', lineHeight: 1.5 }}>You are about to deactivate <strong>{employee.firstName} {employee.lastName}</strong>. This will restrict their access to the system immediately.</p>
              <label className="form-label">Select Termination Reason</label>
              <select className="form-input" value={deactivationStatus} onChange={(e) => setDeactivationStatus(e.target.value)}>
                <option value="">Choose a reason...</option>
                <option value={EmployeeStatus.TERMINATED}>Termination</option>
                <option value={EmployeeStatus.RETIRED}>Retirement</option>
                <option value={EmployeeStatus.INACTIVE}>Inactive</option>
                <option value={EmployeeStatus.SUSPENDED}>Suspension</option>
              </select>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeactivateModal(false)}>Cancel</button>
                <button className="btn-danger" style={{ flex: 1, backgroundColor: 'var(--error)', color: 'white' }} onClick={handleDeactivate} disabled={!deactivationStatus}>Confirm Deactivation</button>
              </div>
            </div>
          </div>
        )}

        {/* Reactivation Modal */}
        {showReactivateModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card animate-fade-in" style={{ maxWidth: '450px', width: '100%', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--success)', marginBottom: '1rem' }}>
                <CheckCircle size={32} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Reactivate Employee</h3>
              </div>
              <p style={{ color: 'var(--slate-600)', marginBottom: '2rem', lineHeight: 1.5 }}>Are you sure you want to reactivate <strong>{employee.firstName} {employee.lastName}</strong>? Their system access will be restored.</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowReactivateModal(false)}>Cancel</button>
                <button className="btn-success" style={{ flex: 1, backgroundColor: 'var(--success)', color: 'white' }} onClick={handleReactivate}>Confirm Reactivation</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}