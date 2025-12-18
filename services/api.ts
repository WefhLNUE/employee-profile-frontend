import { UpdateEmployeeAdminForm } from '../types/employee-profile.types';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  // Check if token exists and is not the literal string "undefined" or "null"
  if (token && token !== 'undefined' && token !== 'null') {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

export const api = {
  getChangeRequestById: async (requestId: string) => {
    const res = await fetch(`http://localhost:5000/employee-profile/change-request/${requestId}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch change request: ${res.status}`);
    return res.json();
  },

  getEmployeeById: async (employeeId: string) => {
    const res = await fetch(`http://localhost:5000/employee-profile/${employeeId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        //'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch employee: ${res.status}`);
    }

    return res.json();
  },


  reviewChangeRequest: async (requestId: string, body: { action: string; patch?: any }) => {
    const res = await fetch(`http://localhost:5000/employee-profile/change-request/${requestId}/review`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to review request: ${res.status}`);
    return res.json();
  },

  updateEmployeeAdmin: async (id: string, body: UpdateEmployeeAdminForm) => {
    const res = await fetch(`http://localhost:5000/employee-profile/${id}/admin`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed to update employee admin data: ${res.status}`);
    return res.json();
  },
};