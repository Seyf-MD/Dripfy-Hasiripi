// types.ts

export interface ScheduleEvent {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  time: string;
  title: string;
  participants: string[];
  type: 'Meeting' | 'Call' | 'Event';
}

export interface FinancialRecord {
  id: string;
  description: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  dueDate: string;
  type: 'Incoming' | 'Outgoing';
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
}

export interface Advantage {
  id: string;
  title: string;
  description: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  type: 'Company' | 'Individual';
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface Task {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Done';
  dueDate: string;
  assignee: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  lastLogin: string;
}

export interface AuditLogEntry {
    id: string;
    user: string;
    action: 'Created' | 'Updated' | 'Deleted' | 'Approved' | 'Denied';
    targetType: string;
    targetId: string;
    timestamp: string;
    details: string;
}

export interface UserPermission {
    userId: string;
    userName: string;
    permissions: {
        [key: string]: {
            view: boolean;
            edit: boolean;
        }
    }
}

export interface SignupRequest {
    id: string;
    name: string;
    email: string;
    phone: string;
    position: string;
    status: 'pending';
    timestamp: string;
}

export interface NotificationSettings {
    email: boolean;
    push: boolean;
}

export type Theme = 'light' | 'dark';
export type UserRole = 'admin' | 'user';
export type AdminSubTab = 'permissions' | 'audit' | 'requests';

export type DataItem = ScheduleEvent | FinancialRecord | Challenge | Advantage | Contact | Task | User;

export interface DashboardData {
  schedule: ScheduleEvent[];
  financials: FinancialRecord[];
  challenges: Challenge[];
  advantages: Advantage[];
  contacts: Contact[];
  tasks: Task[];
  users: User[];
  auditLog: AuditLogEntry[];
  userPermissions: UserPermission[];
  signupRequests: SignupRequest[];
}