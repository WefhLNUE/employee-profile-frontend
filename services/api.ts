import { UpdateEmployeeAdminForm } from '../types/employee-profile.types';
import { API_URL } from '@/lib/config';

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
    const res = await fetch(`${API_URL}/employee-profile/change-request/${requestId}`, {
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
    const res = await fetch(`${API_URL}/employee-profile/${employeeId}`, {
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
    const res = await fetch(`${API_URL}/employee-profile/change-request/${requestId}/review`, {
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
    const res = await fetch(`${API_URL}/employee-profile/${id}/admin`, {
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

  getAllDepartments: async () => {
    const res = await fetch(`${API_URL}/organization-structure/departments`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch departments: ${res.status}`);
    return res.json();
  },

  getAllPositions: async () => {
    const res = await fetch(`${API_URL}/organization-structure/positions`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch positions: ${res.status}`);
    return res.json();
  },

  getSupervisors: async () => {
    const res = await fetch(`${API_URL}/employee-profile/supervisors`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch supervisors: ${res.status}`);
    return res.json();
  },

  getUniquePermissions: async () => {
    const res = await fetch(`${API_URL}/employee-profile/unique-permissions`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch unique permissions: ${res.status}`);
    return res.json();
  },

  getMyRoles: async () => {
    const res = await fetch(`${API_URL}/employee-profile/myrole`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        ...getAuthHeaders(),
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch my roles: ${res.status}`);
    const data = await res.json();
    return data.roles;
  },
  deactivateEmployee: async (id: string, status: string) => {
    const response = await fetch(`${API_URL}/employee-profile/${id}/deactivate`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to deactivate employee');
    }
    return response.json();
  },
  reactivateEmployee: async (id: string) => {
    const response = await fetch(`${API_URL}/employee-profile/${id}/reactivate`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to reactivate employee');
    }
    return response.json();
  },
};