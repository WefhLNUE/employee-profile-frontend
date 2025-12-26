# Employee Profile Module (Frontend)

## Overview
Provides the UI for employee profiles, self-service editing, change requests, and comprehensive admin management capabilities.

## 1. Directory Structure
- `[id]/page.tsx`: Employee profile view with admin edit capabilities
- `page.tsx`: Employee dashboard with multiple views (Overview, All Employees, My Department, Change Requests, My Profile)
- `services/api.ts`: API service layer for `employee-profile` endpoints
- `types/employee-profile.types.ts`: TypeScript interfaces and enums

## 2. Features

### View Profile (US-E2-04)
- **Page:** `app/employee-profile/[id]/page.tsx`
- **Logic:** Fetches profile data and displays employee details, performance history, and appraisal information
- **UI:** Responsive grid layout with status badges and role indicators

### Edit Profile (Self-Service)
- **Features:** Update address, phone, bio, photo
- **Form:** Invokes `updateSelfImmediate` API
- **Fields:** `profilePictureUrl`, `biography`, `personalEmail`, `mobilePhone`, `address`

### Change Requests
- **General Change Request:** Request changes for any profile data requiring HR approval
- **Legal Change Request:** Request changes for legal name and/or marital status
- **Validation:** Only sends non-empty fields to prevent validation errors
- **UI:** Dedicated forms in "My Profile" section with success/error feedback

### Admin Edit (US-EP-04)
- **Access:** HR Managers and HR Admins only
- **Toggle:** Show/hide form button for better UX
- **Sections:**
  - Personal Information (name, DOB, national ID, marital status, hire date)
  - Contact Information (work/personal email, mobile/home phone)
  - Address (street, city, country)
  - Banking Information (bank name, account number)
  - Professional Information (biography, profile picture)
  - Contract Information (dates, type, work type)
  - Employment Status (status, effective date) - excludes SUSPENDED/TERMINATED
  - Organizational Assignment (position, department, supervisor, pay grade)
  - Permissions & Roles management
- **UI Enhancements:**
  - Larger, styled section headers with bottom borders
  - Visual separation from employee info display
  - Comprehensive form with all editable fields
  - Collapsible form with toggle button

### Manager View (US-E4-01)
- **View:** "My Department" tab in dashboard
- **Data:** Displays team members from department head's department
- **Features:** Search and filter capabilities

### Change Request Review
- **Access:** HR Managers, HR Admins, HR Employees
- **Features:** View all pending requests, approve/reject with action buttons
- **UI:** Sortable table with status badges and employee information
