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

        <div style={{ padding: '1rem 0', lineHeight: 1.6 }}>
          <p><strong>Employee #:</strong> {employee.employeeNumber}</p>
          <p><strong>Name:</strong> {employee.firstName} {employee.lastName}</p>
          <p><strong>Email:</strong> {employee.workEmail}</p>
          <p><strong>Role(s):</strong> {employee.roles?.join(', ') || 'N/A'}</p>
          <p>
            <strong>Department:</strong>{' '}
            {employee.primaryDepartmentId?.name || departments.find(d => d._id === employee.primaryDepartmentId)?.name || employee.primaryDepartmentId || 'N/A'}
          </p>
          <p>
            <strong>Position:</strong>{' '}
            {employee.primaryPositionId?.title || positions.find(p => p._id === employee.primaryPositionId)?.title || employee.primaryPositionId || 'N/A'}
          </p>
          <p><strong>Status:</strong> {employee.status || 'Active'}</p>
          <p><strong>Joined:</strong> {employee.createdAt
            ? new Date(employee.createdAt).toLocaleString()
            : 'N/A'}
          </p>

          {myRoles.some(r => [SystemRole.HR_MANAGER, SystemRole.HR_ADMIN, SystemRole.SYSTEM_ADMIN].includes(r as SystemRole)) && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem' }}>
              <h3>Admin Edit</h3>
              <form onSubmit={handleUpdate} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>

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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Status</label>
                    <select className="form-input" onChange={e => handleChange('status', e.target.value)}>
                      <option value="">Select...</option>
                      {Object.values(EmployeeStatus).map(v => (
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
                    <label className="form-label">Pay Grade ID</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Pay Grade ID"
                      onChange={e => handleChange('payGradeId', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ padding: '1rem', border: '1px solid var(--border-light)', borderRadius: '0.5rem', backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0 }}>Management Permissions</h4>
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

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn-primary">Update Employee</button>
                  <div style={{ marginTop: '1.5rem' }}>
                    <button className="btn-primary" onClick={() => router.push('/employee-profile?view=employees')}>
                      Back
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
