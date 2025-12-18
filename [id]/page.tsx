'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../services/api';
import { UpdateEmployeeAdminForm, ContractType, WorkType, EmployeeStatus } from '../types/employee-profile.types';

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
    api.getEmployeeById(employeeId)
      .then((data) => {
        setEmployee(data);
        // Initialize form with existing data? 
        // For partial updates, we might start empty or pre-fill. 
        // Pre-filling basic fields if they exist in validation set.
        // Assuming data has these fields logic is omitted for brevity but recommended.
      })
      .catch((err: any) =>
        setError(err.message || 'Failed to fetch employee details')
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
      setEditForm({}); // Clear form or keep it? Keeping it cleared or synced is better.
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
          <p><strong>Department:</strong> {employee.primaryDepartmentId?.name || employee.primaryDepartmentId || 'N/A'}</p>
          <p><strong>Status:</strong> {employee.status || 'Active'}</p>
          <p><strong>Joined:</strong> {employee.createdAt
            ? new Date(employee.createdAt).toLocaleString()
            : 'N/A'}
          </p>

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
                  <label className="form-label">Primary Position ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Position ID"
                    onChange={e => handleChange('primaryPositionId', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Primary Department ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Department ID"
                    onChange={e => handleChange('primaryDepartmentId', e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Supervisor Role Position ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Supervisor Position ID"
                    onChange={e => handleChange('supervisorPositionId', e.target.value)}
                  />
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

        </div>
      </div>
    </div>
  );
}
