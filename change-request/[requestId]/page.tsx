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
    api.getChangeRequestById(requestId)
      .then(setRequest)
      .catch((err: any) => setError(err.message || 'Failed to fetch request'))
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

  if (!requestId) return <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif", color: 'var(--error)' }}>Invalid Request ID</div>;
  if (loading) return <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif", color: 'var(--info)' }}>Loading...</div>;
  if (error) return <div className="alert alert-error" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif" }}>{error}</div>;
  if (!request) return <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif", color: 'var(--warning)' }}>No request found</div>;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif", minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', padding: '2rem' }}>
      <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
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

          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn-primary" onClick={() => router.back()}>Back</button>
          </div>
        </div>
      </div>
    </div>
  );
}
