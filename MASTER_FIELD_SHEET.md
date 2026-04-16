# Master Field Data Sheet - Routine App

This document provides a comprehensive overview of all data entities, fields, and constraints within the Routine application.

---

## 1. Workspaces
*Central hub for all business activities.*

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique identifier for the workspace. |
| `name` | TEXT | - | Name of the workspace/business. |
| `owner_id` | TEXT | - | ID of the user who owns the workspace. |
| `subscription_plan` | TEXT | DEFAULT 'Free' | Plan type: Free, Pro, Enterprise. |
| `subscription_status` | TEXT | DEFAULT 'active' | Status of the subscription. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp of creation. |

---

## 2. Departments
*Organizational units within a workspace.*

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique identifier for the department. |
| `workspace_id` | TEXT | - | Reference to the parent workspace. |
| `name` | TEXT | - | Name of the department (e.g., HR, Engineering). |
| `manager_id` | TEXT | - | ID of the user managing this department. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp of creation. |

---

## 3. Roles
*Custom roles defined within departments.*

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique identifier for the role. |
| `department_id` | TEXT | - | Reference to the parent department. |
| `name` | TEXT | - | Name of the role (e.g., Senior Developer). |
| `permissions` | TEXT | JSON | List of permissions associated with this role. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp of creation. |

---

## 4. Users
*System users and their preferences.*

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique identifier for the user. |
| `workspace_id` | TEXT | - | Reference to the current workspace. |
| `department_id` | TEXT | - | Reference to the user's department. |
| `role_id` | TEXT | - | Reference to the specific role ID. |
| `name` | TEXT | - | Full name of the user. |
| `email` | TEXT | UNIQUE | User's email address (Login ID). |
| `phone` | TEXT | UNIQUE | User's phone number (OTP Login). |
| `password` | TEXT | - | Hashed password. |
| `role` | TEXT | - | System Role: Owner, Admin, Manager, Employee. |
| `language` | TEXT | DEFAULT 'en' | User's preferred language. |
| `theme_color` | TEXT | DEFAULT 'indigo' | UI theme preference. |
| `is_dark_mode` | INTEGER | DEFAULT 0 | Dark mode toggle (0/1). |
| `manager_id` | TEXT | - | ID of the user's direct manager. |
| `kanban_columns` | TEXT | JSON DEFAULT [...] | Custom Kanban column configuration. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp of registration. |

---

## 5. Projects
*Containers for tasks and collaborative work.*

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique identifier for the project. |
| `workspace_id` | TEXT | - | Reference to the parent workspace. |
| `department_id` | TEXT | - | Reference to the parent department. |
| `name` | TEXT | - | Project title. |
| `description` | TEXT | - | Detailed project description. |
| `kanban_columns` | TEXT | JSON DEFAULT [...] | Project-specific Kanban columns. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp of creation. |

---

## 6. Tasks
*The core unit of work in the system.*

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique identifier for the task. |
| `workspace_id` | TEXT | - | Reference to the parent workspace. |
| `project_id` | TEXT | - | Reference to the parent project. |
| `title` | TEXT | - | Task title. |
| `description` | TEXT | - | Detailed task instructions. |
| `type` | TEXT | DEFAULT 'task' | Type of task (e.g., task, milestone). |
| `created_by` | TEXT | - | ID of the user who created the task. |
| `assigned_to_type`| TEXT | - | user, role, or department. |
| `assigned_to_id` | TEXT | - | ID of the assignee (based on type). |
| `priority` | TEXT | - | High, Medium, Low, None. |
| `status` | TEXT | - | Todo, In Progress, Completed, etc. |
| `due_date` | TEXT | - | Date string (YYYY-MM-DD). |
| `due_time` | TEXT | - | Time string (HH:MM). |
| `reminder_time` | TEXT | - | Time for notification reminders. |
| `requires_approval`| INTEGER | DEFAULT 0 | Whether task needs approval (0/1). |
| `approver_id` | TEXT | - | ID of the user who must approve. |
| `approval_status` | TEXT | - | Pending, Approved, Rejected. |
| `proof_type` | TEXT | DEFAULT 'None' | Required proof: Image, Video, Document, etc. |
| `photo_url` | TEXT | - | URL to the proof photo/file. |
| `attachments` | TEXT | JSON DEFAULT '[]' | List of attached file objects. |
| `checklist` | TEXT | JSON DEFAULT '[]' | List of sub-items to check off. |
| `recurring_rule` | TEXT | - | RRULE string for recurring tasks. |
| `time_spent` | INTEGER | DEFAULT 0 | Total seconds spent on the task. |
| `comments` | TEXT | JSON DEFAULT '[]' | List of comment objects. |
| `subtasks` | TEXT | JSON DEFAULT '[]' | List of subtask objects. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Timestamp of creation. |

---

## 7. OTPs
*One-Time Passwords for secure login.*

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique identifier. |
| `phone` | TEXT | - | Phone number associated with OTP. |
| `code` | TEXT | - | The 6-digit OTP code. |
| `expires_at` | DATETIME | - | Expiration timestamp. |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Generation timestamp. |

---

## 8. Templates
*Pre-defined task structures for recurring work.*

| Field Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | Unique identifier. |
| `workspace_id` | TEXT | - | Parent workspace. |
| `template_name` | TEXT | - | Name of the template. |
| `description` | TEXT | - | Template details. |
| `project_id` | TEXT | - | Default project for this template. |
| `checklist` | TEXT | JSON | Default checklist items. |
| `verification_type`| TEXT | - | Required proof type. |
| `recurrence_rule` | TEXT | - | Default recurrence pattern. |
| `assigned_role` | TEXT | - | Default role to assign tasks to. |

---

## 9. Verifications & Approvals
*Quality control and workflow management.*

**Verifications Table:**
- `id`, `task_id`, `user_id`, `type`, `file_url`, `notes`, `created_at`.

**Approvals Table:**
- `id`, `task_id`, `approver_id`, `status` (Approved/Rejected), `remarks`, `created_at`.

---

## 10. Communication (Messages & Groups)
*Internal chat and collaboration.*

**Messages Table:**
- `id`, `workspace_id`, `sender_id`, `receiver_id`, `group_id`, `message`, `attachment`, `timestamp`.

**Groups Table:**
- `id`, `workspace_id`, `name`, `description`, `created_by`, `created_at`.

**Group Members Table:**
- `group_id`, `user_id`, `role` (admin/member), `joined_at`.

---

## 11. System Utilities
*Logs, Notifications, and Automation.*

**Notifications:**
- `id`, `user_id`, `title`, `message`, `type`, `is_read` (0/1), `created_at`.

**Workflows (Automation):**
- `id`, `workspace_id`, `name`, `trigger_type`, `trigger_condition` (JSON), `action_type`, `action_payload` (JSON), `is_active`.

**Activity Logs:**
- `id`, `workspace_id`, `user_id`, `action`, `details`, `created_at`.

**Time Logs:**
- `id`, `task_id`, `user_id`, `start_time`, `end_time`, `duration`, `created_at`.

**Invitations:**
- `id`, `workspace_id`, `email`, `role`, `code` (Unique), `status` (pending/accepted), `expires_at`.
