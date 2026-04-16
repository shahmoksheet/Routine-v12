import { User } from '../context/AuthContext';

export type Role = 'Owner' | 'Admin' | 'Manager' | 'Employee';

export type SubscriptionPlan = 'Free' | 'Pro' | 'Enterprise';

export interface PlanLimits {
  workspaces: number;
  usersPerWorkspace: number;
  departments: number;
  storageGB: number;
  features: string[];
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  Free: {
    workspaces: 1,
    usersPerWorkspace: 5,
    departments: 2,
    storageGB: 1,
    features: ['Basic Tasks', 'Basic Chat'],
  },
  Pro: {
    workspaces: 3,
    usersPerWorkspace: 50,
    departments: 10,
    storageGB: 50,
    features: ['Advanced Tasks', 'Approvals', 'Reporting', 'Vasy Integration'],
  },
  Enterprise: {
    workspaces: -1, // Unlimited
    usersPerWorkspace: -1,
    departments: -1,
    storageGB: 1000,
    features: ['Custom Roles', 'Audit Logs', 'Dedicated Support', 'SSO'],
  },
};

export const PERMISSIONS = {
  // Workspace Module
  CREATE_WORKSPACE: ['Owner'],
  READ_WORKSPACE: ['Owner', 'Admin', 'Manager', 'Employee'],
  UPDATE_WORKSPACE: ['Owner'],
  DELETE_WORKSPACE: ['Owner'],
  TRANSFER_OWNERSHIP: ['Owner'],
  ASSIGN_ADMIN: ['Owner'],

  // User / Employee (HRMS)
  CREATE_USER: ['Owner', 'Admin'],
  READ_USER: ['Owner', 'Admin', 'Manager', 'Employee'], // Scope limited in UI
  UPDATE_USER: ['Owner', 'Admin', 'Employee'], // Employee limited to self
  DELETE_USER: ['Owner', 'Admin'],
  ASSIGN_ROLE: ['Owner', 'Admin'],
  ASSIGN_MANAGER: ['Owner', 'Admin'],

  // Department Module
  CREATE_DEPARTMENT: ['Owner', 'Admin'],
  READ_DEPARTMENT: ['Owner', 'Admin', 'Manager', 'Employee'],
  UPDATE_DEPARTMENT: ['Owner', 'Admin'],
  DELETE_DEPARTMENT: ['Owner', 'Admin'],
  ASSIGN_DEPT_MANAGER: ['Owner', 'Admin'],
  ADD_EMPLOYEES_DEPT: ['Owner', 'Admin'],

  // Project Module
  CREATE_PROJECT: ['Owner', 'Admin', 'Manager'],
  READ_PROJECT: ['Owner', 'Admin', 'Manager', 'Employee'],
  UPDATE_PROJECT: ['Owner', 'Admin', 'Manager'],
  DELETE_PROJECT: ['Owner', 'Admin'],

  // Hierarchy
  DEFINE_HIERARCHY: ['Owner', 'Admin'],
  UPDATE_REPORTING: ['Owner', 'Admin'],
  VIEW_HIERARCHY: ['Owner', 'Admin', 'Manager', 'Employee'],

  // Task Module
  CREATE_TASK: ['Owner', 'Admin', 'Manager'],
  CREATE_SELF_TASK: ['Owner', 'Admin', 'Manager', 'Employee'],
  READ_TASK: ['Owner', 'Admin', 'Manager', 'Employee'], // Scope limited in UI
  UPDATE_TASK: ['Owner', 'Admin', 'Manager'], // Scope limited to creator
  DELETE_TASK: ['Owner', 'Admin', 'Manager'], // Scope limited to creator
  CHANGE_TASK_STATUS: ['Owner', 'Admin', 'Manager', 'Employee'], // Employee limited to assigned

  // Subtask Module
  CREATE_SUBTASK: ['Owner', 'Admin', 'Manager', 'Employee'],
  READ_SUBTASK: ['Owner', 'Admin', 'Manager', 'Employee'],
  UPDATE_SUBTASK: ['Owner', 'Admin', 'Manager', 'Employee'], // Scope limited to creator/manager
  DELETE_SUBTASK: ['Owner', 'Admin', 'Manager', 'Employee'], // Scope limited to creator/manager

  // Verification & Approval
  SUBMIT_PROOF: ['Owner', 'Admin', 'Manager', 'Employee'],
  VIEW_PROOF: ['Owner', 'Admin', 'Manager', 'Employee'],
  APPROVE_PROOF: ['Owner', 'Admin', 'Manager'],
  APPROVE_TASK: ['Owner', 'Admin', 'Manager'],
  REJECT_TASK: ['Owner', 'Admin', 'Manager'],

  // Issue / Ticket Module
  CREATE_ISSUE: ['Owner', 'Admin', 'Manager', 'Employee'],
  READ_ISSUE: ['Owner', 'Admin', 'Manager', 'Employee'], // Scope limited to own for employee
  UPDATE_ISSUE: ['Owner', 'Admin', 'Manager'], // Creator cannot edit after submission
  ASSIGN_ISSUE: ['Owner', 'Admin', 'Manager'],
  CLOSE_ISSUE: ['Owner', 'Admin', 'Manager'],

  // Chat Module
  SEND_MESSAGE: ['Owner', 'Admin', 'Manager', 'Employee'],
  READ_MESSAGE: ['Owner', 'Admin', 'Manager', 'Employee'],
  DELETE_MESSAGE: ['Owner', 'Admin', 'Manager', 'Employee'], // Scope limited to own

  // Chatbot
  QUERY_DATA: ['Owner', 'Admin', 'Manager', 'Employee'],
  VIEW_STATS: ['Owner', 'Admin', 'Manager', 'Employee'],

  // Notifications
  RECEIVE_NOTIFICATIONS: ['Owner', 'Admin', 'Manager', 'Employee'],
  READ_NOTIFICATIONS: ['Owner', 'Admin', 'Manager', 'Employee'],
  MARK_READ_NOTIFICATIONS: ['Owner', 'Admin', 'Manager', 'Employee'],

  // Activity Logs
  VIEW_LOGS: ['Owner', 'Admin', 'Manager', 'Employee'], // Scope limited in UI

  // Settings
  UPDATE_PROFILE: ['Owner', 'Admin', 'Manager', 'Employee'],
  MANAGE_MEMBERS: ['Owner', 'Admin'],
  MANAGE_ROLES: ['Owner', 'Admin'],
  DELETE_ACCOUNT: ['Owner', 'Admin', 'Manager', 'Employee'],
  
  // Subscription
  MANAGE_SUBSCRIPTION: ['Owner'],
};

export function hasPermission(user: User | null, allowedRoles: string[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

export function canEditTaskCoreFields(user: User | null, taskCreatorId: string): boolean {
  if (!user) return false;
  if (['Owner', 'Admin'].includes(user.role)) return true;
  return user.id === taskCreatorId;
}

export function canDeleteTask(user: User | null, taskCreatorId: string): boolean {
  if (!user) return false;
  if (['Owner', 'Admin'].includes(user.role)) return true;
  return user.id === taskCreatorId;
}

export function canEditSubtask(user: User | null, subtaskCreatorId: string): boolean {
  if (!user) return false;
  if (['Owner', 'Admin', 'Manager'].includes(user.role)) return true;
  return user.id === subtaskCreatorId;
}

export function canDeleteSubtask(user: User | null, subtaskCreatorId: string): boolean {
  if (!user) return false;
  if (['Owner', 'Admin', 'Manager'].includes(user.role)) return true;
  return user.id === subtaskCreatorId;
}

export function canUpdateTaskStatus(user: User | null, taskAssigneeId: string): boolean {
  if (!user) return false;
  if (['Owner', 'Admin', 'Manager'].includes(user.role)) return true;
  if (taskAssigneeId.startsWith('dept_')) {
    const deptId = taskAssigneeId.replace('dept_', '');
    return user.departmentId === deptId;
  }
  return user.id === taskAssigneeId;
}

export function canApproveTask(user: User | null, task: any): boolean {
  if (!user || !task) return false;
  if (['Owner', 'Admin'].includes(user.role)) return true;
  
  const taskCreatorId = task.createdBy || '';
  if (user.id === taskCreatorId) return true;

  if (user.role === 'Manager') {
    // Manager can approve if task is assigned to their department or a user in their department
    // Since we don't have full user list here, we check if it's assigned to their department directly
    // Or if they created it (checked above)
    if (user.departmentId && task.assignees?.includes(`dept_${user.departmentId}`)) {
      return true;
    }
    // Ideally we would check if assignee is in manager's department, but we need users list.
    // For now, we allow if they are a Manager and the task is in their project/department context.
    // Let's assume they can approve tasks they are assigned to or created.
    if (task.assignees?.includes(user.id)) return true;
  }

  return false;
}

export function canEditIssue(user: User | null, issueCreatorId: string, isSubmitted: boolean): boolean {
  if (!user) return false;
  if (isSubmitted && user.id === issueCreatorId && user.role === 'Employee') return false; // Rule 3: Issue Lock
  return ['Owner', 'Admin', 'Manager'].includes(user.role);
}
