export const api = {
  getChangeRequestById: async (requestId: string) => {
    const res = await fetch(`http://localhost:5000/employee-profile/change-request/${requestId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch change request: ${res.status}`);
    return res.json();
  },

  reviewChangeRequest: async (requestId: string, body: { action: string; patch?: any }) => {
    const res = await fetch(`http://localhost:5000/employee-profile/change-request/${requestId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to review request: ${res.status}`);
    return res.json();
  },
};
