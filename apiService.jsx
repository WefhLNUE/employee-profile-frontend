'use client';
class APIService {
  constructor() {
    this.baseURL = 'http://localhost:5000';
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
        mode: 'cors'
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Backend returned ${contentType || 'non-JSON'} response. Is your backend running at ${this.baseURL}?`);
      }

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid or missing token - Please log in again');
        }
        throw new Error(data.message || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async getAllEmployees() {
    return this.request('/employee-profile');
  }

  async getEmployee(id) {
    return this.request(`/employee-profile/${id}`);
  }

  async getMyProfile(employeeNumber) {
    return this.request(`/employee-profile/${employeeNumber}/my-profile`);
  }

  async updateSelfImmediate(employeeNumber, data) {
    return this.request(`/employee-profile/${employeeNumber}/my-profile/immediate`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async createEmployee(data) {
    return this.request('/employee-profile', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateEmployeeAdmin(id, data) {
    return this.request(`/employee-profile/${id}/admin`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getMyEmployees() {
    return this.request('/employee-profile/my-employees');
  }

  async createChangeRequest(employeeNumber, data) {
    return this.request(`/employee-profile/${employeeNumber}/my-profile/change-request`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getAllChangeRequests() {
    return this.request('/employee-profile/change-requests/all');
  }

  async reviewChangeRequest(requestId, data) {
    return this.request(`/employee-profile/change-request/${requestId}/review`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createCandidate(data) {
    return this.request('/employee-profile/candidate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getByRole(role) {
    return this.request(`/employee-profile/roles?role=${role}`);
  }
}

export default APIService;
