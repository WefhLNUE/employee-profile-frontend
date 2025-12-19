'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../services/api';
import { UpdateEmployeeAdminForm, ContractType, WorkType, EmployeeStatus, SystemRole } from '../types/employee-profile.types';

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

  // Departments and Positions for dropdowns
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [uniquePermissions, setUniquePermissions] = useState<string[]>([]);
  const [newPermission, setNewPermission] = useState('');
  const [myRoles, setMyRoles] = useState<string[]>([]);
  const [showAdminEdit, setShowAdminEdit] = useState(false);

  useEffect(() => {
    // If the token exists in props/context, set it in localStorage
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

    // Fetch employee, departments, positions, and supervisors in parallel
    console.log(api.getUniquePermissions().catch(() => []))
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
        setEditForm(prev => ({
          ...prev,
          permissions: employeeData.permissions || [],
          roles: employeeData.roles || []
        }));
        console.log(permissionsData)
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
      // Refresh data
      const updated = await api.getEmployeeById(employeeId);
      setEmployee(updated);
      //setEditForm({}); // Clear form or keep it? Keeping it cleared or synced is better.
    } catch (err: any) {
      setError(err.message || 'Failed to update employee');
    }
  };

  const handleChange = (field: keyof UpdateEmployeeAdminForm, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
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
      // Refresh data
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
      // Refresh data
      const updated = await api.getEmployeeById(employeeId);
      setEmployee(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate employee');
      setShowDeactivateModal(false);
    }
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--info)' }}>
        Loading employee details...
      </div>
    );
  }

  if (!employee) {
    return (
      <div style={{ color: 'var(--warning)' }}>
        Employee not found or Error: {error}
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        minHeight: '100vh',
        backgroundColor: 'var(--bg-secondary)',
        padding: '2rem',
      }}
    >
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
            Employee Details
          </h2>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', padding: '1.5rem 0' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee #</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{employee.employeeNumber}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{employee.firstName} {employee.lastName}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{employee.workEmail}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined Date</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
              {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
              {employee.primaryDepartmentId?.name || departments.find(d => d._id === employee.primaryDepartmentId)?.name || employee.primaryDepartmentId || 'N/A'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Position</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
              {employee.primaryPositionId?.title || positions.find(p => p._id === employee.primaryPositionId)?.title || employee.primaryPositionId || 'N/A'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pay Grade</span>
            <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{employee.payGradeId?.grade || 'N/A'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
            <div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                backgroundColor: employee.status === 'ACTIVE' ? '#d1fae5' :
                  employee.status === 'SUSPENDED' ? '#fee2e2' :
                    employee.status === 'TERMINATED' ? '#1f2937' : '#f3f4f6',
                color: employee.status === 'ACTIVE' ? '#065f46' :
                  employee.status === 'SUSPENDED' ? '#b91c1c' :
                    employee.status === 'TERMINATED' ? '#f9fafb' : '#374151',
              }}>
                {employee.status || 'Active'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Roles</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {employee.roles && employee.roles.length > 0 ? (
                employee.roles.map((role: string) => (
                  <span key={role} style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)'
                  }}>
                    {role}
                  </span>
                ))
              ) : (
                <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No specific roles assigned</span>
              )}
            </div>
          </div>

        </div>

        {/* Appraisal History for HR Manager/System Admin */}
        {myRoles.some(r => [SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN].includes(r as SystemRole)) && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-light)', paddingTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>
                Performance & Appraisal History
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Appraisal Date</span>
                <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {employee.lastAppraisalDate ? new Date(employee.lastAppraisalDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{employee.lastAppraisalScore ?? 'N/A'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rating</span>
                <div>
                  <span style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.375rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.9rem',
                    fontWeight: 500
                  }}>
                    {employee.lastAppraisalRatingLabel || 'N/A'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scale Type</span>
                <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{employee.lastAppraisalScaleType || 'N/A'}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Development Plan Summary</span>
                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.6, maxWidth: '65ch' }}>
                  {employee.lastDevelopmentPlanSummary || 'N/A'}
                </p>
              </div>

            </div>
          </div>
        )}

        {myRoles.some(r => [SystemRole.HR_MANAGER, 'HR_MANAGER', SystemRole.HR_ADMIN, 'HR_ADMIN'].includes(r as SystemRole | string)) && (
          <div style={{
            marginTop: '3rem',
            paddingTop: '2rem',
            borderTop: '3px solid var(--primary-500)',
            backgroundColor: 'var(--bg-primary)',
            padding: '2rem',
            borderRadius: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                  color: 'var(--primary-700)'
                }}>Admin Edit</h2>
                <p style={{
                  fontSize: '0.95rem',
                  color: 'var(--text-secondary)',
                  marginBottom: 0
                }}>
                  Update employee information below. All fields are optional.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminEdit(!showAdminEdit)}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.95rem',
                  fontWeight: 500
                }}
              >
                {showAdminEdit ? (
                  <>
                    <span>Hide Form</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>Show Form</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {showAdminEdit && (
              <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '1.5rem', marginTop: '2rem' }}>

                {/* Personal Information Section */}
                <div>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--primary-200)', paddingBottom: '0.5rem' }}>Personal Information</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={employee.firstName || 'First Name'}
                        onChange={e => handleChange('firstName', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={employee.lastName || 'Last Name'}
                        onChange={e => handleChange('lastName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        className="form-input"
                        onChange={e => handleChange('dateOfBirth', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">National ID</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={employee.nationalId || 'National ID'}
                        onChange={e => handleChange('nationalId', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Marital Status</label>
                      <select className="form-input" onChange={e => handleChange('maritalStatus', e.target.value)}>
                        <option value="">Select...</option>
                        <option value="SINGLE">Single</option>
                        <option value="MARRIED">Married</option>
                        <option value="DIVORCED">Divorced</option>
                        <option value="WIDOWED">Widowed</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Date of Hire</label>
                      <input
                        type="date"
                        className="form-input"
                        onChange={e => handleChange('dateOfHire', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information Section */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--primary-200)', paddingBottom: '0.5rem' }}>Contact Information</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Work Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder={employee.workEmail || 'work@example.com'}
                        onChange={e => handleChange('workEmail', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Personal Email</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder={employee.personalEmail || 'personal@example.com'}
                        onChange={e => handleChange('personalEmail', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Mobile Phone</label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder={employee.mobilePhone || '+1234567890'}
                        onChange={e => handleChange('mobilePhone', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Home Phone</label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder={employee.homePhone || '+1234567890'}
                        onChange={e => handleChange('homePhone', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--primary-200)', paddingBottom: '0.5rem' }}>Address</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Street Address</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={employee.address?.streetAddress || '123 Main St'}
                        onChange={e => handleChange('streetAddress', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">City</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={employee.address?.city || 'City'}
                        onChange={e => handleChange('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={employee.address?.country || 'Country'}
                        onChange={e => handleChange('country', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Banking Information Section */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--primary-200)', paddingBottom: '0.5rem' }}>Banking Information</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Bank Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={employee.bankName || 'Bank Name'}
                        onChange={e => handleChange('bankName', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Bank Account Number</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={employee.bankAccountNumber || 'Account Number'}
                        onChange={e => handleChange('bankAccountNumber', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Information Section */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--primary-200)', paddingBottom: '0.5rem' }}>Professional Information</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Biography</label>
                      <textarea
                        className="form-input"
                        rows={4}
                        placeholder={employee.biography || 'Professional biography...'}
                        onChange={e => handleChange('biography', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Profile Picture URL</label>
                      <input
                        type="url"
                        className="form-input"
                        placeholder={employee.profilePictureUrl || 'https://example.com/photo.jpg'}
                        onChange={e => handleChange('profilePictureUrl', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Contract Information Section */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--primary-200)', paddingBottom: '0.5rem' }}>Contract Information</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Contract Start Date</label>
                      <input
                        type="date"
                        className="form-input"
                        onChange={e => handleChange('contractStartDate', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Contract End Date</label>
                      <input
                        type="date"
                        className="form-input"
                        onChange={e => handleChange('contractEndDate', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Contract Type</label>
                      <select className="form-input" onChange={e => handleChange('contractType', e.target.value)}>
                        <option value="">Select...</option>
                        {Object.values(ContractType).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Work Type</label>
                      <select className="form-input" onChange={e => handleChange('workType', e.target.value)}>
                        <option value="">Select...</option>
                        {Object.values(WorkType).map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Employment Status Section */}
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--primary-200)', paddingBottom: '0.5rem' }}>Employment Status</h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Status</label>
                      <select className="form-input" onChange={e => handleChange('status', e.target.value)}>
                        <option value="">Select...</option>
                        {Object.values(EmployeeStatus)
                          .filter(v => v !== EmployeeStatus.SUSPENDED && v !== EmployeeStatus.TERMINATED)
                          .map(v => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Status Effective From</label>
                      <input
                        type="date"
                        className="form-input"
                        onChange={e => handleChange('statusEffectiveFrom', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Primary Position</label>
                      <select
                        className="form-input"
                        onChange={e => handleChange('primaryPositionId', e.target.value)}
                        defaultValue=""
                      >
                        <option value="">Select Position...</option>
                        {positions.map(pos => (
                          <option key={pos._id} value={pos._id}>
                            {pos.title} ({pos.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Primary Department</label>
                      <select
                        className="form-input"
                        onChange={e => handleChange('primaryDepartmentId', e.target.value)}
                        defaultValue=""
                      >
                        <option value="">Select Department...</option>
                        {departments.map(dept => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label className="form-label">Supervisor</label>
                      <select
                        className="form-input"
                        onChange={e => handleChange('supervisorPositionId', e.target.value)}
                        defaultValue=""
                      >
                        <option value="">Select Supervisor...</option>
                        {supervisors.map(sup => (
                          <option key={sup._id} value={sup.primaryPositionId}>
                            {sup.firstName} {sup.lastName} ({sup.employeeNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Pay Grade (Name)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Grade A"
                        defaultValue={employee.payGradeId?.grade || ''}
                        onChange={e => handleChange('payGradeName', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '0.5rem', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0 }}>Manage Permissions</h4>
                    {employee?.permissionsLastUpdated && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Last updated: {new Date(employee.permissionsLastUpdated).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', margin: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <select
                          className="form-input"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && !(editForm.permissions || []).includes(val)) {
                              handleChange('permissions', [...(editForm.permissions || []), val]);
                            }
                          }}
                        >
                          <option value="">Select existing permission...</option>
                          {uniquePermissions.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Or type a custom permission..."
                          value={newPermission}
                          onChange={(e) => setNewPermission(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newPermission && !(editForm.permissions || []).includes(newPermission)) {
                                handleChange('permissions', [...(editForm.permissions || []), newPermission]);
                                setNewPermission('');
                              }
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          if (newPermission && !(editForm.permissions || []).includes(newPermission)) {
                            handleChange('permissions', [...(editForm.permissions || []), newPermission]);
                            setNewPermission('');
                          }
                        }}
                      >Add Custom</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {(editForm.permissions || []).map((perm, idx) => (
                      <span key={idx} style={{
                        backgroundColor: 'var(--bg-primary)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        border: '1px solid var(--border-light)'
                      }}>
                        {perm}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (editForm.permissions || []).filter((_, i) => i !== idx);
                            handleChange('permissions', updated);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                        >×</button>
                      </span>
                    ))}
                    {(editForm.permissions || []).length === 0 && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No extra permissions set</span>}
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '1.5rem', paddingTop: '1rem' }}>
                    <h4 style={{ marginBottom: '0.75rem' }}>Manage Roles</h4>
                    <div style={{ display: 'flex', gap: '1rem', margin: '0 0 1rem 0' }}>
                      <div style={{ flex: 1 }}>
                        <select
                          className="form-input"
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && !(editForm.roles || []).includes(val)) {
                              handleChange('roles', [...(editForm.roles || []), val]);
                            }
                          }}
                        >
                          <option value="">Select a role to add...</option>
                          {Object.values(SystemRole).map(role => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {(editForm.roles || []).map((role, idx) => (
                        <span key={idx} style={{
                          backgroundColor: 'var(--bg-secondary)',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.875rem',
                          border: '1px solid var(--border-light)'
                        }}>
                          {role}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (editForm.roles || []).filter((_, i) => i !== idx);
                              handleChange('roles', updated);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                          >×</button>
                        </span>
                      ))}
                      {(editForm.roles || []).length === 0 && <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No roles assigned</span>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
                  <button type="submit" className="btn-primary">Update Employee</button>
                  {/* Deactivate Button for HR Admin */}
                  {myRoles.some(r => [SystemRole.HR_ADMIN, 'HR_ADMIN'].includes(r)) && (employee.status === EmployeeStatus.ACTIVE || !employee.status) && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => setShowDeactivateModal(true)}
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca'
                      }}
                    >
                      Deactivate Profile
                    </button>
                  )}
                  {/* Reactivate Button for HR Admin */}
                  {myRoles.some(r => [SystemRole.HR_ADMIN, 'HR_ADMIN'].includes(r)) && (employee.status && employee.status !== EmployeeStatus.ACTIVE) && (
                    <button
                      type="button"
                      className="btn-success"
                      onClick={() => setShowReactivateModal(true)}
                      style={{
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0'
                      }}
                    >
                      Reactivate Profile
                    </button>
                  )}
                  <div style={{ flex: 1 }}></div>
                  <div style={{ marginTop: '0' }}>
                    <button className="btn-primary" onClick={() => router.push('/employee-profile?view=employees')}>
                      Back
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Deactivation Modal */}
        {showDeactivateModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
              <div className="card-header">
                <h3>Deactivate Employee</h3>
              </div>
              <div style={{ padding: '1rem' }}>
                <p>Are you sure you want to deactivate <strong>{employee.firstName} {employee.lastName}</strong>?</p>
                <p style={{ fontSize: '0.9rem', color: '#666' }}>
                  This will prevent them from logging into the system. Please select a reason status:
                </p>

                <select
                  className="form-input"
                  style={{ marginTop: '1rem' }}
                  value={deactivationStatus}
                  onChange={(e) => setDeactivationStatus(e.target.value)}
                >
                  <option value="">Select Status...</option>
                  <option value={EmployeeStatus.TERMINATED}>{EmployeeStatus.TERMINATED}</option>
                  <option value={EmployeeStatus.RETIRED}>{EmployeeStatus.RETIRED}</option>
                  <option value={EmployeeStatus.INACTIVE}>{EmployeeStatus.INACTIVE}</option>
                  <option value={EmployeeStatus.SUSPENDED}>{EmployeeStatus.SUSPENDED}</option>
                </select>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowDeactivateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-danger"
                    onClick={handleDeactivate}
                    disabled={!deactivationStatus}
                    style={{
                      backgroundColor: !deactivationStatus ? '#ccc' : '#ef4444',
                      color: 'white',
                      cursor: !deactivationStatus ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Confirm Deactivation
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reactivation Modal */}
        {showReactivateModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000
          }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
              <div className="card-header">
                <h3>Reactivate Employee</h3>
              </div>
              <div style={{ padding: '1rem' }}>
                <p>Are you sure you want to reactivate <strong>{employee.firstName} {employee.lastName}</strong>?</p>
                <p style={{ fontSize: '0.9rem', color: '#666' }}>
                  This will restore their system access and set their status back to ACTIVE.
                </p>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowReactivateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-success"
                    onClick={handleReactivate}
                    style={{
                      backgroundColor: '#10b981',
                      color: 'white',
                    }}
                  >
                    Confirm Reactivaton
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}