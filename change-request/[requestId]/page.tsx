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
  const [updating, setUpdating] = useState(false);

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

    Promise.all([
      api.getChangeRequestById(requestId),
      api.getAllDepartments(),
      api.getAllPositions(),
      api.getSupervisors()
    ])
      .then(([reqData, depts, pos, sups]) => {
        setRequest(reqData);
        setDepartments(depts);
        setPositions(pos);
        setSupervisors(sups);

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
      })
      .catch((err: any) => setError(err.message || 'Failed to fetch data'))
      .finally(() => setLoading(false));
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

  if (!requestId) return <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif", color: 'var(--error)' }}>Invalid Request ID</div>;
  if (loading) return <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif", color: 'var(--info)' }}>Loading...</div>;
  if (error) return <div className="alert alert-error" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" }}>{error}</div>;
  if (!request) return <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif", color: 'var(--warning)' }}>No request found</div>;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif", minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: '700px', margin: '0 auto', marginBottom: '2rem' }}>
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Change Request Details</h2>
        </div>
        <div style={{ padding: '1rem 0', lineHeight: 1.6 }}>
          <p><strong>ID:</strong> {request.requestId}</p>
          <p><strong>Employee:</strong> {request.employeeProfileId?.firstName} {request.employeeProfileId?.lastName}</p>
          <p><strong>Description:</strong> {request.requestDescription}</p>
          <p>
            <strong>Status:</strong> <StatusBadge status={request.status} />
          </p>
          <p><strong>Submitted:</strong> {new Date(request.submittedAt).toLocaleString()}</p>

          {request.status === 'PENDING' && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button className="btn-success" onClick={() => handleAction('APPROVED')}>Approve</button>
              <button className="btn-danger" onClick={() => handleAction('REJECTED')}>Reject</button>
              <button className="btn-secondary" onClick={() => handleAction('CANCELED')}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div className="card-header">
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Edit Employee Details</h2>
        </div>
        <div style={{ padding: '1.5rem 0' }}>
          <form onSubmit={handleUpdateEmployee} style={{ display: 'grid', gap: '1rem' }}>
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                className="input"
                value={editFormData.firstName}
                onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                className="input"
                value={editFormData.lastName}
                onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Marital Status</label>
              <select
                className="select"
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
              <label>Department</label>
              <select
                className="select"
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
              <label>Position</label>
              <select
                className="select"
                value={editFormData.primaryPositionId}
                onChange={(e) => setEditFormData({ ...editFormData, primaryPositionId: e.target.value })}
              >
                <option value="">Select Position</option>
                {positions.map((pos) => (
                  <option key={pos._id} value={pos._id}>{pos.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Supervisor Position</label>
              <select
                className="select"
                value={editFormData.supervisorPositionId}
                onChange={(e) => setEditFormData({ ...editFormData, supervisorPositionId: e.target.value })}
              >
                <option value="">Select Supervisor Position</option>
                {supervisors.map((sup) => (
                  <option key={sup._id} value={sup.primaryPositionId}>{sup.firstName} {sup.lastName}</option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" disabled={updating}>
                {updating ? 'Saving...' : 'Save Employee Changes'}
              </button>
            </div>
          </form>

          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn-secondary" onClick={() => router.push('/employee-profile?view=change-requests')}>Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}
