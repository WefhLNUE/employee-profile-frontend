'use client'
import React, { useState, useEffect } from 'react';
import { Users, FileText, UserPlus, CheckCircle, XCircle, Clock, ChevronRight, Menu, X, Edit2, Save, AlertCircle } from 'lucide-react';

// API Service
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

const api = new APIService();

const styles = {
  primaryColor: '#3b82f6',
  primaryHover: '#2563eb',
  successColor: '#22c55e',
  dangerColor: '#ef4444',
  warningColor: '#f59e0b',
  warningHover: '#d97706',
  textPrimary: '#111827',
  textSecondary: '#4b5563',
  textTertiary: '#6b7280',
  bgPrimary: '#ffffff',
  bgSecondary: '#f9fafb',
  borderLight: '#e5e7eb',
  borderMedium: '#d1d5db'
};

// All Employees Page
const AllEmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await api.getAllEmployees();
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '3rem', 
            height: '3rem', 
            border: `4px solid ${styles.primaryColor}`, 
            borderTopColor: 'transparent', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: styles.textSecondary }}>Loading employees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: '#fee2e2', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <AlertCircle style={{ color: '#ef4444', marginRight: '0.75rem' }} size={24} />
          <div>
            <h3 style={{ color: '#991b1b', fontWeight: 600, marginBottom: '0.25rem' }}>Error Loading Employees</h3>
            <p style={{ color: '#991b1b', fontSize: '0.875rem' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: styles.textPrimary, marginBottom: '0.25rem' }}>All Employees</h1>
          <p style={{ color: styles.textSecondary }}>Manage and view employee information</p>
        </div>
        <button style={{ 
          backgroundColor: styles.primaryColor,
          color: 'white',
          padding: '0.625rem 1.25rem',
          borderRadius: '0.5rem',
          border: 'none',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <UserPlus size={20} />
          Add Employee
        </button>
      </div>

      <div style={{ backgroundColor: styles.bgPrimary, borderRadius: '0.75rem', border: `1px solid ${styles.borderLight}`, padding: '1.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <input
          type="text"
          placeholder="Search by name, employee number, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            border: `1px solid ${styles.borderMedium}`,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            outline: 'none'
          }}
        />
      </div>

      <div style={{ fontSize: '0.875rem', color: styles.textSecondary }}>
        Showing <span style={{ fontWeight: 600, color: styles.textPrimary }}>{filteredEmployees.length}</span> of <span style={{ fontWeight: 600, color: styles.textPrimary }}>{employees.length}</span> employees
      </div>

      <div style={{ backgroundColor: styles.bgPrimary, borderRadius: '0.75rem', border: `1px solid ${styles.borderLight}`, overflow: 'hidden', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: styles.bgSecondary, borderBottom: `2px solid ${styles.borderMedium}` }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: styles.textSecondary, textTransform: 'uppercase' }}>Employee #</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: styles.textSecondary, textTransform: 'uppercase' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: styles.textSecondary, textTransform: 'uppercase' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: styles.textSecondary, textTransform: 'uppercase' }}>Phone</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: styles.textSecondary, textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: styles.textTertiary }}>
                    No employees found
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp._id} style={{ borderBottom: `1px solid ${styles.borderLight}` }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{emp.employeeNumber}</td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ 
                          width: '2.5rem', 
                          height: '2.5rem', 
                          backgroundColor: styles.primaryColor, 
                          borderRadius: '50%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: 'white', 
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}>
                          {emp.firstName?.[0]}{emp.lastName?.[0]}
                        </div>
                        <div style={{ fontWeight: 500 }}>
                          {emp.firstName} {emp.lastName}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: styles.textSecondary }}>{emp.email || 'N/A'}</td>
                    <td style={{ padding: '1rem', color: styles.textSecondary }}>{emp.mobilePhone || 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>
                      <button 
                        onClick={() => setSelectedEmployee(emp)}
                        style={{ 
                          color: styles.primaryColor, 
                          fontWeight: 500, 
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        View Details <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEmployee && (
        <EmployeeDetailModal 
          employee={selectedEmployee} 
          onClose={() => setSelectedEmployee(null)}
          onUpdate={loadEmployees}
        />
      )}
    </div>
  );
};

// Employee Detail Modal
const EmployeeDetailModal = ({ employee, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({
      firstName: employee.firstName || '',
      lastName: employee.lastName || '',
      email: employee.email || '',
      mobilePhone: employee.mobilePhone || '',
      personalEmail: employee.personalEmail || '',
      biography: employee.biography || ''
    });
  }, [employee]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateEmployeeAdmin(employee._id, formData);
      await onUpdate();
      setIsEditing(false);
      alert('Employee updated successfully');
    } catch (error) {
      alert('Failed to update employee: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div style={{ backgroundColor: styles.bgPrimary, borderRadius: '0.75rem', width: '100%', maxWidth: '48rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ borderBottom: `1px solid ${styles.borderLight}`, padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: styles.bgPrimary }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: styles.textPrimary }}>Employee Details</h2>
            <p style={{ fontSize: '0.875rem', color: styles.textSecondary, marginTop: '0.25rem' }}>{employee.employeeNumber}</p>
          </div>
          <button onClick={onClose} style={{ color: styles.textTertiary, border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingBottom: '1.5rem', borderBottom: `1px solid ${styles.borderLight}` }}>
            <div style={{ 
              width: '6rem', 
              height: '6rem', 
              backgroundColor: styles.primaryColor, 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              fontSize: '1.875rem',
              fontWeight: 'bold'
            }}>
              {employee.firstName?.[0]}{employee.lastName?.[0]}
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: styles.textPrimary }}>{employee.firstName} {employee.lastName}</h3>
              <p style={{ color: styles.textSecondary }}>{employee.employeeNumber}</p>
              <p style={{ fontSize: '0.875rem', color: styles.textTertiary, marginTop: '0.25rem' }}>{employee.email}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: styles.textSecondary, marginBottom: '0.5rem' }}>First Name</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.firstName}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: `1px solid ${styles.borderMedium}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: isEditing ? styles.bgPrimary : styles.bgSecondary,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: styles.textSecondary, marginBottom: '0.5rem' }}>Last Name</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.lastName}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: `1px solid ${styles.borderMedium}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: isEditing ? styles.bgPrimary : styles.bgSecondary,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: styles.textSecondary, marginBottom: '0.5rem' }}>Work Email</label>
              <input
                type="email"
                disabled={!isEditing}
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: `1px solid ${styles.borderMedium}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: isEditing ? styles.bgPrimary : styles.bgSecondary,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: styles.textSecondary, marginBottom: '0.5rem' }}>Personal Email</label>
              <input
                type="email"
                disabled={!isEditing}
                value={formData.personalEmail}
                onChange={e => setFormData({...formData, personalEmail: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: `1px solid ${styles.borderMedium}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: isEditing ? styles.bgPrimary : styles.bgSecondary,
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: styles.textSecondary, marginBottom: '0.5rem' }}>Mobile Phone</label>
              <input
                type="tel"
                disabled={!isEditing}
                value={formData.mobilePhone}
                onChange={e => setFormData({...formData, mobilePhone: e.target.value})}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: `1px solid ${styles.borderMedium}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: isEditing ? styles.bgPrimary : styles.bgSecondary,
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: styles.textSecondary, marginBottom: '0.5rem' }}>Biography</label>
              <textarea
                disabled={!isEditing}
                value={formData.biography}
                onChange={e => setFormData({...formData, biography: e.target.value})}
                rows="4"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  border: `1px solid ${styles.borderMedium}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: isEditing ? styles.bgPrimary : styles.bgSecondary,
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${styles.borderLight}`, padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', position: 'sticky', bottom: 0, backgroundColor: styles.bgPrimary }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.625rem 1.25rem',
              border: `1px solid ${styles.borderMedium}`,
              borderRadius: '0.5rem',
              fontWeight: 500,
              cursor: 'pointer',
              backgroundColor: 'transparent'
            }}
          >
            Close
          </button>
          {isEditing ? (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: saving ? styles.textTertiary : styles.primaryColor,
                color: 'white',
                borderRadius: '0.5rem',
                fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: styles.primaryColor,
                color: 'white',
                borderRadius: '0.5rem',
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Edit2 size={18} />
              Edit Employee
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main App Component
const EmployeeProfileApp = () => {
  const [currentPage, setCurrentPage] = useState('all-employees');
  
  // const currentUser = {
  //   employeeNumber: 'EMP-1001',
  //   firstName: 'John',
  //   lastName: 'Doe',
  //   roles: ['HR_MANAGER', 'DEPARTMENT_HEAD']
  // };
  useEffect(() => {
    const employeeNumber = Cookies.get('employeeNumber'); // match your cookie name
    const roles = Cookies.get('roles'); // if you store roles in a cookie (as JSON string)

    setCurrentUser({
      employeeNumber: employeeNumber || '', 
      roles: roles ? JSON.parse(roles) : [], // parse JSON string if stored like that
    });
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'all-employees':
        return <AllEmployeesPage />;
      default:
        return <AllEmployeesPage />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: styles.bgSecondary }}>
      <nav style={{ backgroundColor: styles.bgPrimary, borderBottom: `1px solid ${styles.borderLight}`, padding: '1rem 2rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: styles.textPrimary }}>HR System</h1>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setCurrentPage('all-employees')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: 500,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: currentPage === 'all-employees' ? styles.primaryColor : 'transparent',
                color: currentPage === 'all-employees' ? 'white' : styles.textSecondary
              }}
            >
              All Employees
            </button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {renderPage()}
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EmployeeProfileApp;