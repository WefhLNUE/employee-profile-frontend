'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../services/api';

export default function ChangeRequestDetails() {
  const router = useRouter();
  const params = useParams();

  let requestId: string | undefined;
  if (params?.requestId) {
    requestId = Array.isArray(params.requestId) ? params.requestId[0] : params.requestId;
  }

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for employee edit
  const [editFormData, setEditFormData] = useState<any>({
    firstName: '',
    lastName: '',
    maritalStatus: '',
    primaryDepartmentId: '',
    primaryPositionId: '',
    supervisorPositionId: '',
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  const isHR = roles.includes('HR Manager') || roles.includes('HR Admin');

  const StatusBadge: React.FC<{ status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' }> = ({ status }) => {
    const styles: Record<string, string> = {
      PENDING: 'badge-pending',
      APPROVED: 'badge-approved',
      REJECTED: 'badge-rejected',
      CANCELED: 'badge-error',
    };
    return <span className={`badge ${styles[status]}`}>{status}</span>;
  };

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        // Fetch roles and request details first
        const [rolesData, reqData] = await Promise.all([
          api.getMyRoles(),
          api.getChangeRequestById(requestId)
        ]);

        setRoles(rolesData);
        setRequest(reqData);

        // Initialize form with employee data
        if (reqData.employeeProfileId) {
          const emp = reqData.employeeProfileId;
          setEditFormData({
            firstName: emp.firstName || '',
            lastName: emp.lastName || '',
            maritalStatus: emp.maritalStatus || '',
            primaryDepartmentId: emp.primaryDepartmentId || '',
            primaryPositionId: emp.primaryPositionId || '',
            supervisorPositionId: emp.supervisorPositionId || '',
          });
        }

        // Only fetch restricted data if user is HR Manager or HR Admin
        if (rolesData.includes('HR Manager') || rolesData.includes('HR Admin')) {
          const [depts, pos, sups] = await Promise.all([
            api.getAllDepartments(),
            api.getAllPositions(),
            api.getSupervisors()
          ]);
          setDepartments(depts);
          setPositions(pos);
          setSupervisors(sups);
        }
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [requestId]);

  const handleAction = async (action: 'APPROVED' | 'REJECTED' | 'CANCELED') => {
    if (!requestId) return;
    setLoading(true);
    try {
      const updated = await api.reviewChangeRequest(requestId, { action });
      setRequest(updated);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request?.employeeProfileId?._id) return;

    setUpdating(true);
    try {
      await api.updateEmployeeAdmin(request.employeeProfileId._id, editFormData);
      alert('Employee details updated successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to update employee details');
    } finally {
      setUpdating(false);
    }
  };

  if (!requestId) return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>Invalid Request ID</div>;
  if (loading) return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ color: '#6b7280', fontSize: '1.25rem' }}>Loading details...</div>
    </div>
  );
  if (error) return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
      <div className="alert alert-error">{error}</div>
    </div>
  );
  if (!request) return <div style={{ padding: '2rem', textAlign: 'center', color: '#f59e0b' }}>No request found</div>;

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '2rem',
      color: '#111827'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        :root {
          --primary: #2563eb;
          --primary-hover: #1d4ed8;
          --success: #10b981;
          --danger: #ef4444;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --text-primary: #111827;
          --text-secondary: #4b5563;
          --border-light: #e5e7eb;
        }

        .card {
          background: white;
          border-radius: 1rem;
          border: 1px solid var(--border-light);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          margin-bottom: 2rem;
        }

        .card-header {
          padding: 1.5rem;
          border-bottom: 1px solid var(--border-light);
          background-color: var(--gray-50);
        }

        .card-body {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.25rem;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .form-input, .form-select {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid var(--gray-300);
          font-size: 0.875rem;
          color: var(--text-primary);
          background-color: white;
          transition: all 0.2s ease;
          outline: none;
        }

        .form-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 1.25rem;
        }

        .form-input:focus, .form-select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-select option {
          color: black;
          padding: 0.5rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.75rem 1.5rem;
          border-radius: 0.75rem;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          gap: 0.5rem;
        }

        .btn-primary { background: var(--primary); color: white; }
        .btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }
        .btn-primary:active { transform: translateY(0); }

        .btn-secondary { background: white; color: var(--text-primary); border: 1px solid var(--gray-300); }
        .btn-secondary:hover { background: var(--gray-100); }

        .btn-success { background: var(--success); color: white; }
        .btn-success:hover { background: #059669; }

        .btn-danger { background: var(--danger); color: white; }
        .btn-danger:hover { background: #dc2626; }

        .badge {
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-pending { background-color: #fef3c7; color: #92400e; }
        .badge-approved { background-color: #d1fae5; color: #065f46; }
        .badge-rejected { background-color: #fee2e2; color: #991b1b; }
        .badge-error { background-color: #f3f4f6; color: #4b5563; }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.5rem;
        }

        @media (max-width: 640px) {
          .details-grid { grid-template-columns: 1fr; }
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .detail-value {
          font-size: 1rem;
          font-weight: 500;
        }
      `}</style>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto 2rem auto' }}>
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Request Overview</h2>
        </div>
        <div className="card-body">
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Request ID</span>
              <span className="detail-value">{request.requestId}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Submitted On</span>
              <span className="detail-value">{new Date(request.submittedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Employee</span>
              <span className="detail-value">{request.employeeProfileId?.firstName} {request.employeeProfileId?.lastName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Current Status</span>
              <div><StatusBadge status={request.status} /></div>
            </div>
            <div className="detail-item" style={{ gridColumn: 'span 2' }}>
              <span className="detail-label">Description</span>
              <span className="detail-value" style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', marginTop: '0.5rem', border: '1px solid #e5e7eb' }}>
                {request.requestDescription}
              </span>
            </div>
          </div>

          {request.status === 'PENDING' && (
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              {isHR && (
                <>
                  <button className="btn btn-success" onClick={() => handleAction('APPROVED')}>
                    Approve Request
                  </button>
                  <button className="btn btn-danger" onClick={() => handleAction('REJECTED')}>
                    Reject Request
                  </button>
                </>
              )}

              <button className="btn btn-secondary" onClick={() => handleAction('CANCELED')}>
                {isHR ? 'Cancel Request' : 'Cancel My Request'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isHR && (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card-header">
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Edit Employee Details</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleUpdateEmployee} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Marital Status</label>
                <select
                  className="form-select"
                  value={editFormData.maritalStatus}
                  onChange={(e) => setEditFormData({ ...editFormData, maritalStatus: e.target.value })}
                >
                  <option value="">Select Status</option>
                  <option value="SINGLE">Single</option>
                  <option value="MARRIED">Married</option>
                  <option value="DIVORCED">Divorce</option>
                  <option value="WIDOWED">Widowed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select
                  className="form-select"
                  value={editFormData.primaryDepartmentId}
                  onChange={(e) => setEditFormData({ ...editFormData, primaryDepartmentId: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Position</label>
                <select
                  className="form-select"
                  value={editFormData.primaryPositionId}
                  onChange={(e) => setEditFormData({ ...editFormData, primaryPositionId: e.target.value })}
                >
                  <option value="">Select Position</option>
                  {positions.map((pos) => (
                    <option key={pos._id} value={pos._id}>{pos.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Supervisor Position</label>
                <select
                  className="form-select"
                  value={editFormData.supervisorPositionId}
                  onChange={(e) => setEditFormData({ ...editFormData, supervisorPositionId: e.target.value })}
                >
                  <option value="">Select Supervisor Position</option>
                  {supervisors.map((sup) => (
                    <option key={sup._id} value={sup.primaryPositionId}>{sup.firstName} {sup.lastName}</option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={updating}>
                  {updating ? 'Saving Changes...' : 'Save Employee Details'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => router.push('/employee-profile?view=change-requests')}>
                  Return to Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!isHR && (
        <div style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center' }}>
          <button className="btn btn-primary" onClick={() => router.push('/employee-profile?view=my-change-requests')}>
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
