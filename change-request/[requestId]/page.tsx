'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../services/api';
import Head from 'next/head';
import {
  FileText, ArrowLeft, CheckCircle, XCircle, AlertCircle,
  Calendar, User as UserIcon, Building, Briefcase, Hash,
  Clock, Shield, Save, Settings
} from 'lucide-react';
import OrgChangeRequestModal from '../../components/OrgChangeRequestModal';

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

  // Org Change Request Modal State
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [orgModalDescription, setOrgModalDescription] = useState('');
  const [orgModalEmployeeId, setOrgModalEmployeeId] = useState('');

  const isHR = roles.includes('HR Manager') || roles.includes('HR Admin');

  const StatusBadge: React.FC<{ status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED' }> = ({ status }) => {
    const styles: Record<string, string> = {
      PENDING: 'badge-pending',
      APPROVED: 'badge-approved',
      REJECTED: 'badge-rejected',
      CANCELED: 'badge-cancelled'
    };
    return <span className={`badge ${styles[status]}`}>{status}</span>;
  };

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);

    const fetchData = async () => {
      try {
        const [rolesData, reqData] = await Promise.all([
          api.getMyRoles(),
          api.getChangeRequestById(requestId)
        ]);

        setRoles(rolesData);
        setRequest(reqData);

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

      // Check if it's a standard request (REQ-) and is APPROVED -> Trigger Popup
      if (action === 'APPROVED' && requestId.startsWith('REQ-') && !requestId.startsWith('LEGAL-REQ-')) {
        setOrgModalDescription(updated?.requestDescription || '');
        setOrgModalEmployeeId(updated?.employeeProfileId?._id || updated?.employeeProfileId || '');
        setIsOrgModalOpen(true);
      }

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
      // Filter out empty strings to avoid 400 errors on backend validation
      const payload: any = {};
      Object.keys(editFormData).forEach(key => {
        if (editFormData[key] !== '' && editFormData[key] !== null && editFormData[key] !== undefined) {
          payload[key] = editFormData[key];
        }
      });

      await api.updateEmployeeAdmin(request.employeeProfileId._id, payload);
      setUpdateSuccess('Employee details updated successfully');
      setTimeout(() => setUpdateSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update employee details');
    } finally {
      setUpdating(false);
    }
  };

  if (!requestId) return <div className="error-container">Invalid Request ID</div>;
  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <div className="loading-text">Loading request details...</div>
    </div>
  );

  if (error) return (
    <div className="error-card">
      <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
      <h3 className="text-lg font-bold text-red-700">Error Loading Request</h3>
      <p className="text-red-600 mb-4">{error}</p>
      <button onClick={() => window.location.reload()} className="btn btn-primary bg-red-600 hover:bg-red-700">
        Try Again
      </button>
    </div>
  );

  if (!request) return (
    <div className="not-found-container">
      <FileText className="w-16 h-16 text-yellow-500 mb-4" />
      <h2 className="text-xl font-bold text-slate-800">Request Not Found</h2>
      <p className="text-slate-500 mb-6">The change request you're looking for doesn't exist.</p>
      <button onClick={() => router.push('/employee-profile')} className="btn btn-primary">
        Return to Dashboard
      </button>
    </div>
  );

  return (
    <div className="page-container">
      <Head>
        <title>Change Request Details</title>
      </Head>

      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <button
            onClick={() => router.push(isHR ? '/employee-profile?view=change-requests' : '/employee-profile?view=my-change-requests')}
            className="back-btn"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="page-title">Request Details</h1>
              <p className="text-slate-500 text-sm">Manage and review profile change requests</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
          <StatusBadge status={request.status} />
        </div>
      </header>

      <main className="main-content">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Request Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <FileText size={18} className="text-primary-500" />
                  Request Information
                </h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="info-group">
                    <label className="info-label">Request ID</label>
                    <div className="info-value font-mono text-sm">{request.requestId}</div>
                  </div>
                  <div className="info-group">
                    <label className="info-label">Submitted On</label>
                    <div className="info-value flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      {new Date(request.submittedAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="info-group">
                    <label className="info-label">Employee</label>
                    <div className="info-value flex items-center gap-2">
                      <UserIcon size={14} className="text-slate-400" />
                      <span className="font-medium text-slate-800">
                        {request.employeeProfileId?.firstName} {request.employeeProfileId?.lastName}
                      </span>
                    </div>
                  </div>
                  {request.processedAt && (
                    <div className="info-group">
                      <label className="info-label">Processed On</label>
                      <div className="info-value flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" />
                        {new Date(request.processedAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <label className="info-label mb-2 block">Description</label>
                  <div className="bg-slate-50 p-4 rounded-lg text-slate-700 text-sm border border-slate-100">
                    {request.requestDescription || 'No description provided.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {request.status === 'PENDING' && (
              <div className="card">
                <div className="card-body flex flex-wrap gap-3">
                  {isHR && (
                    <>
                      <button onClick={() => handleAction('APPROVED')} className="btn btn-success flex-1">
                        <CheckCircle size={18} />
                        Approve Request
                      </button>
                      <button onClick={() => handleAction('REJECTED')} className="btn btn-danger flex-1">
                        <XCircle size={18} />
                        Reject Request
                      </button>
                    </>
                  )}
                  <button onClick={() => handleAction('CANCELED')} className="btn btn-secondary flex-1">
                    <XCircle size={18} />
                    {isHR ? 'Cancel Request' : 'Withdraw Request'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Edit Employee (HR Only) */}
          <div className="lg:col-span-1">
            {isHR && (
              <div className="card h-full">
                <div className="card-header bg-slate-50">
                  <h2 className="card-title text-slate-600">
                    <Shield size={18} />
                    Quick Update
                  </h2>
                </div>
                <div className="card-body">
                  <form onSubmit={handleUpdateEmployee} className="space-y-4">
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
                        <option value="DIVORCED">Divorced</option>
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
                        <option value="">Select Supervisor</option>
                        {supervisors.map((sup) => (
                          <option key={sup._id} value={sup.primaryPositionId}>{sup.firstName} {sup.lastName}</option>
                        ))}
                      </select>
                    </div>

                    {updateSuccess && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center shadow-sm animate-in fade-in slide-in-from-top-2">
                        <CheckCircle size={18} className="mr-2 text-green-600" />
                        {updateSuccess}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary w-full justify-center mt-4"
                      disabled={updating}
                    >
                      {updating ? <span className="spinner w-4 h-4 mr-2"></span> : <Save size={18} className="mr-2" />}
                      {updating ? 'Saving...' : 'Save Changes'}
                    </button>

                    <div className="pt-4 mt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => router.push(`/employee-profile/${request.employeeProfileId._id}?tab=admin`)}
                        className="btn btn-secondary w-full justify-center text-slate-600 hover:text-primary-600 hover:border-primary-200"
                      >
                        <Settings size={18} className="mr-2" />
                        Full Admin Edit
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

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
      </main >

      <style jsx global>{`
        /* --- CSS VARIABLES & THEME --- */
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

        .page-container {
           min-height: 100vh;
           background-color: var(--bg-secondary);
           zoom: 0.85;
           display: flex;
           flex-direction: column;
        }

        /* --- BUTTONS --- */
        .btn {
           display: inline-flex;
           align-items: center;
           padding: 0.625rem 1.25rem;
           border-radius: var(--radius-md);
           font-weight: 600;
           font-size: 0.875rem;
           cursor: pointer;
           transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
           border: none;
        }
        .btn-primary {
           background-color: var(--primary-600);
           color: var(--text-inverse);
           box-shadow: var(--shadow-sm);
        }
        .btn-primary:hover {
           background-color: var(--primary-700);
           box-shadow: var(--shadow-md);
           transform: translateY(-1px);
        }
        .btn-secondary {
           background-color: var(--bg-primary);
           color: var(--text-primary);
           border: 1px solid var(--border-light);
        }
        .btn-secondary:hover {
           background-color: var(--bg-secondary);
           border-color: var(--border-medium);
        }
        .btn-success {
           background-color: var(--success);
           color: white;
           box-shadow: var(--shadow-sm);
        }
        .btn-success:hover { background-color: var(--success-dark); }
        .btn-danger {
           background-color: var(--error);
           color: white;
           box-shadow: var(--shadow-sm);
        }
        .btn-danger:hover { background-color: var(--error-dark); }

        /* --- CARDS --- */
        .card {
           background-color: var(--bg-primary);
           border: 1px solid var(--border-light);
           border-radius: var(--radius-lg);
           box-shadow: var(--shadow-sm);
           overflow: hidden;
           transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card-header {
           padding: 1.25rem 1.5rem;
           border-bottom: 1px solid var(--border-light);
           background-color: #fff;
        }
        .card-title {
           font-size: 1rem;
           font-weight: 600;
           color: var(--slate-800);
           display: flex;
           align-items: center;
           gap: 0.5rem;
        }
        .card-body {
           padding: 1.5rem;
        }

        /* --- HEADER --- */
        .page-header {
           background-color: var(--bg-primary);
           border-bottom: 1px solid var(--border-light);
           padding: 1.5rem 2rem;
           display: flex;
           justify-content: space-between;
           align-items: center;
           position: sticky;
           top: 0;
           z-index: 10;
        }
        .header-content {
           display: flex;
           flex-direction: column;
           gap: 1rem;
        }
        .back-btn {
           background: none;
           border: none;
           color: var(--slate-500);
           font-size: 0.875rem;
           display: flex;
           align-items: center;
           gap: 0.5rem;
           cursor: pointer;
           padding: 0;
        }
        .back-btn:hover { color: var(--primary-600); }
        .page-title {
           font-size: 1.5rem;
           font-weight: 700;
           color: var(--text-primary);
           line-height: 1.2;
        }
        .main-content {
           padding: 2rem;
           max-width: 1400px;
           margin: 0 auto;
           width: 100%;
        }

        /* --- FORMS --- */
        .form-group { margin-bottom: 1rem; }
        .form-label {
           display: block;
           color: var(--slate-700);
           font-size: 0.75rem;
           font-weight: 600;
           margin-bottom: 0.375rem;
           text-transform: uppercase;
           letter-spacing: 0.025em;
        }
        .form-input, .form-select {
           width: 100%;
           padding: 0.625rem 0.875rem;
           border: 1px solid var(--border-light);
           border-radius: var(--radius-md);
           font-size: 0.875rem;
           transition: all 0.2s;
           background-color: var(--bg-primary);
        }
        .form-input:focus, .form-select:focus {
           outline: none;
           border-color: var(--border-focus);
           box-shadow: 0 0 0 3px var(--primary-100);
        }

        /* --- INFO GROUPS --- */
        .info-label {
           color: var(--slate-500);
           font-size: 0.75rem;
           font-weight: 600;
           text-transform: uppercase;
           letter-spacing: 0.05em;
           margin-bottom: 0.25rem;
        }
        .info-value {
           color: var(--text-primary);
           font-size: 0.9375rem;
        }

        /* --- BADGES --- */
        .badge {
           display: inline-flex;
           align-items: center;
           padding: 0.25rem 0.75rem;
           border-radius: 9999px;
           font-size: 0.75rem;
           font-weight: 600;
           text-transform: capitalize;
        }
        .badge-pending { background-color: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; }
        .badge-approved { background-color: #f0fdf4; color: #15803d; border: 1px solid #dcfce7; }
        .badge-rejected { background-color: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .badge-cancelled { background-color: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

        /* --- UTILS --- */
        .spinner {
           width: 1.5rem;
           height: 1.5rem;
           border: 2px solid rgba(0,0,0,0.1);
           border-left-color: currentColor;
           border-radius: 50%;
           animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .loading-container, .error-container, .not-found-container {
           display: flex;
           flex-direction: column;
           align-items: center;
           justify-content: center;
           min-height: 80vh;
           text-align: center;
        }
      `}</style>
    </div >
  );
}