// Employee Profile Types
// These types should match the backend schemas/DTOs

export interface Address {
  city?: string;
  streetAddress?: string;
  country?: string;
}

export interface Employee {
  _id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  workEmail?: string;
  personalEmail?: string;
  phone?: string;
  mobilePhone?: string;
  position?: string;
  biography?: string;
  profilePictureUrl?: string;
  address?: Address;
}

export interface ChangeRequest {
  requestId: string;
  employeeProfileId: {
    firstName: string;
    lastName: string;
  };
  requestDescription: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  submittedAt: string | Date;
}

export interface CurrentUser {
  employeeNumber: string;
  roles: string[];
  primaryDepartmentId: string;
}

// System Roles enum - matches backend
export enum SystemRole {
  DEPARTMENT_EMPLOYEE = 'department employee',
  DEPARTMENT_HEAD = 'department head',
  HR_MANAGER = 'HR Manager',
  HR_EMPLOYEE = 'HR Employee',
  PAYROLL_SPECIALIST = 'Payroll Specialist',
  PAYROLL_MANAGER = 'Payroll Manager',
  SYSTEM_ADMIN = 'System Admin',
  LEGAL_POLICY_ADMIN = 'Legal & Policy Admin',
  RECRUITER = 'Recruiter',
  FINANCE_STAFF = 'Finance Staff',
  JOB_CANDIDATE = 'Job Candidate',
  HR_ADMIN = 'HR Admin',
}

export interface CandidateForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: SystemRole;
  nationalId: string;
}

export interface EmployeeForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
}

export interface ChangeRequestForm {
  requestDescription: string;
  reason: string;
}

export interface SelfUpdateForm {
  profilePictureUrl: string;
  biography: string;
  personalEmail: string;
  mobilePhone: string;
  address: Address;
}

export interface APIResponse<T> {
  data?: T;
  message?: string;
}

