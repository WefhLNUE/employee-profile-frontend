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
  primaryPositionId?: any;
  primaryDepartmentId?: any;
  biography?: string;
  profilePictureUrl?: string;
  address?: Address;
  permissions?: string[];
  roles?: string[];
  permissionsLastUpdated?: string | Date;
  status?: EmployeeStatus;
  // Appraisal fields
  lastAppraisalRecordId?: any;
  lastAppraisalCycleId?: any;
  lastAppraisalTemplateId?: any;
  lastAppraisalDate?: string | Date;
  lastAppraisalScore?: number;
  lastAppraisalRatingLabel?: string;
  lastAppraisalScaleType?: string;
  lastDevelopmentPlanSummary?: string;
}

export interface ChangeRequest {
  requestId: string;
  employeeProfileId: {
    firstName: string;
    lastName: string;
  };
  requestDescription: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
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


export enum ContractType {
  FULL_TIME_CONTRACT = 'FULL_TIME_CONTRACT',
  PART_TIME_CONTRACT = 'PART_TIME_CONTRACT',
}

export enum WorkType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
}

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  RETIRED = 'RETIRED',
  PROBATION = 'PROBATION',
  TERMINATED = 'TERMINATED',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}

export interface UpdateEmployeeAdminForm {
  firstName?: string;
  lastName?: string;
  maritalStatus?: MaritalStatus;
  contractStartDate?: string;
  contractEndDate?: string;
  contractType?: ContractType;
  workType?: WorkType;
  status?: EmployeeStatus;
  statusEffectiveFrom?: string;
  primaryPositionId?: string;
  primaryDepartmentId?: string;
  supervisorPositionId?: string;
  payGradeId?: string;
  permissions?: string[];
  roles?: string[];
}

export interface APIResponse<T> {
  data?: T;
  message?: string;
}

