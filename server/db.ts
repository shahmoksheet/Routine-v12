import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const db = new Database('app.db');
db.pragma('journal_mode = WAL');

// Initialize DB Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT,
    owner_id TEXT,
    subscription_plan TEXT DEFAULT 'Free',
    subscription_status TEXT DEFAULT 'active',
    org_type TEXT DEFAULT 'hierarchical',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    name TEXT,
    manager_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    department_id TEXT,
    name TEXT,
    description TEXT,
    permissions TEXT,
    color TEXT,
    is_system INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    department_id TEXT,
    role_id TEXT,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password TEXT,
    role TEXT, -- Owner, Admin, Manager, Employee
    language TEXT DEFAULT 'en',
    theme_color TEXT DEFAULT 'indigo',
    is_dark_mode INTEGER DEFAULT 0,
    is_deleted INTEGER DEFAULT 0,
    manager_id TEXT,
    kanban_columns TEXT DEFAULT '[{"id":"Todo","title":"To Do"},{"id":"In Progress","title":"In Progress"},{"id":"Pending Approval","title":"Review"},{"id":"Completed","title":"Done"}]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    department_id TEXT,
    department_ids TEXT DEFAULT '[]',
    name TEXT,
    description TEXT,
    kanban_columns TEXT DEFAULT '[{"id":"Todo","title":"To Do"},{"id":"In Progress","title":"In Progress"},{"id":"Pending Approval","title":"Review"},{"id":"Completed","title":"Done"}]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    project_id TEXT,
    title TEXT,
    description TEXT,
    type TEXT DEFAULT 'task',
    created_by TEXT,
    assigned_to_type TEXT, -- user, role, department
    assigned_to_id TEXT,
    priority TEXT,
    status TEXT, -- Pending, In Progress, Completed, Under Review, Approved, Rejected
    due_date TEXT,
    due_time TEXT,
    reminder_time TEXT,
    requires_approval INTEGER DEFAULT 0,
    approver_id TEXT,
    approval_status TEXT,
    proof_type TEXT DEFAULT 'None',
    photo_url TEXT,
    attachments TEXT DEFAULT '[]',
    checklist TEXT DEFAULT '[]',
    recurring_rule TEXT,
    time_spent INTEGER DEFAULT 0,
    comments TEXT DEFAULT '[]',
    subtasks TEXT DEFAULT '[]',
    geofence_lat REAL,
    geofence_lng REAL,
    geofence_radius REAL, -- in meters
    geofence_enforcement TEXT, -- 'start', 'complete', 'both',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS otps (
    id TEXT PRIMARY KEY,
    phone TEXT,
    code TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    template_name TEXT,
    description TEXT,
    project_id TEXT,
    checklist TEXT,
    verification_type TEXT,
    recurrence_rule TEXT,
    assigned_role TEXT,
    geofence_lat REAL,
    geofence_lng REAL,
    geofence_radius REAL,
    geofence_enforcement TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS verifications (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    user_id TEXT,
    type TEXT,
    file_url TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    approver_id TEXT,
    status TEXT,
    remarks TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    sender_id TEXT,
    receiver_id TEXT,
    group_id TEXT,
    message TEXT,
    attachment TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    name TEXT,
    description TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT,
    user_id TEXT,
    role TEXT DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    title TEXT,
    message TEXT,
    type TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    user_id TEXT,
    action TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    role_id TEXT,
    code TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS time_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    user_id TEXT,
    start_time DATETIME,
    end_time DATETIME,
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS draft_tasks (
    id TEXT PRIMARY KEY,
    phone_number TEXT,
    workspace_id TEXT,
    created_by TEXT,
    title TEXT,
    description TEXT,
    assigned_to_id TEXT,
    due_date TEXT,
    due_time TEXT,
    priority TEXT,
    status TEXT DEFAULT 'pending_confirmation',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add columns to existing tables if they don't exist
try { db.exec('ALTER TABLE roles ADD COLUMN workspace_id TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE roles ADD COLUMN description TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE roles ADD COLUMN color TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE roles ADD COLUMN is_system INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN geofence_lat REAL'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN geofence_lng REAL'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN geofence_radius REAL'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN geofence_enforcement TEXT'); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN dependencies TEXT DEFAULT '[]'"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN related_tasks TEXT DEFAULT '[]'"); } catch (e) {}
try { db.exec('ALTER TABLE templates ADD COLUMN geofence_lat REAL'); } catch (e) {}
try { db.exec('ALTER TABLE templates ADD COLUMN geofence_lng REAL'); } catch (e) {}
try { db.exec('ALTER TABLE templates ADD COLUMN geofence_radius REAL'); } catch (e) {}
try { db.exec('ALTER TABLE templates ADD COLUMN geofence_enforcement TEXT'); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN kanban_columns TEXT DEFAULT '[{\"id\":\"Todo\",\"title\":\"To Do\"},{\"id\":\"In Progress\",\"title\":\"In Progress\"},{\"id\":\"Pending Approval\",\"title\":\"Review\"},{\"id\":\"Completed\",\"title\":\"Done\"}]'"); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN phone TEXT UNIQUE'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN is_deleted INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN is_deactivated INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN department_ids TEXT DEFAULT '[]'"); } catch (e) {}
try { db.exec('ALTER TABLE workspaces ADD COLUMN is_deactivated INTEGER DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE tasks ADD COLUMN is_deactivated INTEGER DEFAULT 0'); } catch (e) {}

// Seed initial data if empty
const workspaceCount = db.prepare('SELECT COUNT(*) as count FROM workspaces').get() as { count: number };
if (workspaceCount.count === 0) {
  db.prepare('INSERT OR IGNORE INTO workspaces (id, name, owner_id, subscription_plan) VALUES (?, ?, ?, ?)').run('w1', 'FreshMart Global', 'u7', 'Enterprise');
  db.prepare('INSERT OR IGNORE INTO workspaces (id, name, owner_id, subscription_plan) VALUES (?, ?, ?, ?)').run('w2', 'FreshMart Warehouse', 'u7', 'Pro');
  
  db.prepare('INSERT OR IGNORE INTO departments (id, workspace_id, name, manager_id) VALUES (?, ?, ?, ?)').run('d1', 'w1', 'Head Office', 'u3');
  db.prepare('INSERT OR IGNORE INTO departments (id, workspace_id, name, manager_id) VALUES (?, ?, ?, ?)').run('d2', 'w1', 'Sales & Retail', 'u5');
  db.prepare('INSERT OR IGNORE INTO departments (id, workspace_id, name, manager_id) VALUES (?, ?, ?, ?)').run('d3', 'w1', 'Logistics', 'u9');
  db.prepare('INSERT OR IGNORE INTO departments (id, workspace_id, name, manager_id) VALUES (?, ?, ?, ?)').run('d4', 'w1', 'Inventory', 'u11');
  
  db.prepare('INSERT OR IGNORE INTO roles (id, workspace_id, department_id, name, permissions, color) VALUES (?, ?, ?, ?, ?, ?)').run('r1', 'w1', 'd1', 'Admin', '["manage_members","manage_roles","manage_departments","manage_projects","view_projects","manage_tasks","create_tasks","approve_tasks","manage_chat","use_ai","view_reports","view_audit_logs","switch_workspace"]', '#4f46e5');
  db.prepare('INSERT OR IGNORE INTO roles (id, workspace_id, department_id, name, permissions, color) VALUES (?, ?, ?, ?, ?, ?)').run('r2', 'w1', 'd2', 'Store Manager', '["view_tasks", "create_tasks", "update_tasks", "approve_tasks"]', '#ec4899');
  db.prepare('INSERT OR IGNORE INTO roles (id, workspace_id, department_id, name, permissions, color) VALUES (?, ?, ?, ?, ?, ?)').run('r3', 'w1', 'd3', 'Logistics Coordinator', '["view_tasks", "create_tasks", "update_tasks"]', '#f59e0b');
  db.prepare('INSERT OR IGNORE INTO roles (id, workspace_id, department_id, name, permissions, color) VALUES (?, ?, ?, ?, ?, ?)').run('r4', 'w1', 'd2', 'Sales Associate', '["view_tasks", "update_tasks"]', '#10b981');
}

// Always ensure demo users exist
const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, workspace_id, department_id, role_id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const hashedPassword = bcrypt.hashSync('password123', 10);

insertUser.run('u7', 'w1', null, null, 'Moksheet Shah', 'moksheet77@gmail.com', '7777777777', hashedPassword, 'Owner');
insertUser.run('u8', 'w1', 'd1', 'r1', 'Sarah Chen', 'sarah@globaltech.demo', '8888888888', hashedPassword, 'Admin');
insertUser.run('u3', 'w1', 'd1', 'r2', 'David Miller', 'david@globaltech.demo', '1111111111', hashedPassword, 'Manager');
insertUser.run('u5', 'w1', 'd2', 'r2', 'Elena Rodriguez', 'elena@globaltech.demo', '2222222222', hashedPassword, 'Manager');
insertUser.run('u9', 'w1', 'd3', 'r3', 'James Wilson', 'james@globaltech.demo', '3333333333', hashedPassword, 'Manager');
insertUser.run('u11', 'w1', 'd4', 'r3', 'Michael Scott', 'michael@globaltech.demo', '4444444444', hashedPassword, 'Manager');
insertUser.run('u4', 'w1', 'd1', 'r4', 'Linda Park', 'linda@globaltech.demo', '5555555555', hashedPassword, 'Employee');
insertUser.run('u6', 'w1', 'd2', 'r4', 'Tom Harris', 'tom@globaltech.demo', '6666666666', hashedPassword, 'Employee');
insertUser.run('u10', 'w1', 'd3', 'r4', 'Robert Brown', 'robert@globaltech.demo', '0000000000', hashedPassword, 'Employee');

const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
if (projectCount.count === 0) {
  const insertProject = db.prepare('INSERT OR IGNORE INTO projects (id, workspace_id, department_id, name, description, kanban_columns) VALUES (?, ?, ?, ?, ?, ?)');
  insertProject.run('p1', 'w1', 'd1', 'Store Expansion - Downtown', 'Opening a new outlet in the downtown area', JSON.stringify([
    { id: 'Todo', title: 'Planning' },
    { id: 'In Progress', title: 'Construction' },
    { id: 'Review', title: 'Inspection' },
    { id: 'Done', title: 'Launched' }
  ]));
  insertProject.run('p2', 'w1', 'd2', 'Holiday Sale 2026', 'Planning and execution of the annual holiday sale', JSON.stringify([
    { id: 'Todo', title: 'Inventory Check' },
    { id: 'In Progress', title: 'Marketing' },
    { id: 'Review', title: 'Staffing' },
    { id: 'Done', title: 'Active' }
  ]));
  insertProject.run('p3', 'w1', 'd3', 'Warehouse Optimization', 'Improving logistics and storage efficiency', JSON.stringify([
    { id: 'Todo', title: 'Audit' },
    { id: 'In Progress', title: 'Implementation' },
    { id: 'Done', title: 'Optimized' }
  ]));
}

const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };
if (taskCount.count === 0) {
  const insert = db.prepare('INSERT OR IGNORE INTO tasks (id, workspace_id, project_id, title, description, assigned_to_type, assigned_to_id, priority, status, due_date, proof_type, recurring_rule, time_spent, comments, subtasks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  // Store Expansion Tasks
  insert.run('t1', 'w1', 'p1', 'Finalize Lease for Downtown Site', 'Review legal documents and sign the lease', 'user', 'u8', 'Critical', 'In Progress', '2026-04-20', 'None', null, 0, JSON.stringify([]), JSON.stringify([]), 'u7');
  insert.run('t2', 'w1', 'p1', 'Hire Store Staff', 'Interview and hire 10 new associates', 'user', 'u3', 'High', 'Todo', '2026-05-15', 'None', null, 0, JSON.stringify([]), JSON.stringify([]), 'u8');
  
  // Holiday Sale Tasks
  insert.run('t3', 'w1', 'p2', 'Order Seasonal Inventory', 'Place orders for holiday-themed products', 'user', 'u5', 'High', 'In Progress', '2026-04-18', 'None', null, 0, JSON.stringify([]), JSON.stringify([]), 'u8');
  insert.run('t4', 'w1', 'p2', 'Design Sale Banners', 'Create visual assets for store-front and online', 'user', 'u4', 'Medium', 'Todo', '2026-04-25', 'Image', null, 0, JSON.stringify([]), JSON.stringify([]), 'u5');
  
  // Logistics Tasks
  insert.run('t5', 'w1', 'p3', 'Route Optimization for Delivery', 'Analyze and improve delivery routes', 'user', 'u9', 'Medium', 'In Progress', '2026-04-22', 'None', null, 0, JSON.stringify([]), JSON.stringify([]), 'u9');
  insert.run('t6', 'w1', 'p3', 'Inventory Audit - Section A', 'Perform a full count of stock in Section A', 'user', 'u11', 'High', 'Todo', '2026-04-19', 'Image', 'Monthly', 0, JSON.stringify([]), JSON.stringify([]), 'u11');
}

const groupCount = db.prepare('SELECT COUNT(*) as count FROM groups').get() as { count: number };
if (groupCount.count === 0) {
  const insertGroup = db.prepare('INSERT OR IGNORE INTO groups (id, workspace_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)');
  const insertMember = db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)');
  const insertMsg = db.prepare('INSERT OR IGNORE INTO messages (id, workspace_id, sender_id, receiver_id, group_id, message) VALUES (?, ?, ?, ?, ?, ?)');

  // General Group
  insertGroup.run('g1', 'w1', 'General Announcements', 'Workspace-wide announcements', 'u7');
  ['u7', 'u8', 'u3', 'u5', 'u9', 'u11', 'u4', 'u6', 'u10'].forEach(uid => insertMember.run('g1', uid, uid === 'u7' ? 'admin' : 'member'));
  insertMsg.run('m1', 'w1', 'u7', null, 'g1', 'Welcome to FreshMart Global workspace! Let\'s get things done.');
  insertMsg.run('m2', 'w1', 'u8', null, 'g1', 'Thanks Moksheet! Ready to start.');

  // Sales Group
  insertGroup.run('g2', 'w1', 'Sales Team', 'Coordination for sales and retail', 'u5');
  ['u5', 'u6', 'u8'].forEach(uid => insertMember.run('g2', uid, uid === 'u5' ? 'admin' : 'member'));
  insertMsg.run('m3', 'w1', 'u5', null, 'g2', 'Team, we need to finalize the Holiday Sale inventory by Friday.');
  insertMsg.run('m4', 'w1', 'u6', null, 'g2', 'I\'m on it, Elena. Checking Section B now.');

  // Direct Messages
  insertMsg.run('m5', 'w1', 'u7', 'u8', null, 'Hi Sarah, can you check the lease for the downtown site?');
  insertMsg.run('m6', 'w1', 'u8', 'u7', null, 'Sure, I\'ll have it ready by tomorrow morning.');
}

const draftCount = db.prepare('SELECT COUNT(*) as count FROM draft_tasks').get() as { count: number };
if (draftCount.count === 0) {
  const insertDraft = db.prepare('INSERT OR IGNORE INTO draft_tasks (id, phone_number, workspace_id, created_by, title, description, priority, due_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  // Drafts for Moksheet (u7)
  insertDraft.run('drf1', '+1234567890', 'w1', 'u7', 'Review Q3 Marketing Budget', 'Received via WhatsApp. Needs approval before Friday.', 'High', '2026-04-20', 'pending_confirmation');
  insertDraft.run('drf2', '+1987654321', 'w1', 'u7', 'Client Meeting with Acme Corp', 'Discuss new contract terms. They mentioned they want a 10% discount.', 'Medium', '2026-04-18', 'pending_confirmation');
  insertDraft.run('drf4', '+1555666777', 'w1', 'u7', 'Order new office supplies', 'We are running out of printer ink and A4 paper.', 'Low', null, 'pending_confirmation');

  // Drafts for David (u3)
  insertDraft.run('drf3', '+1122334455', 'w1', 'u3', 'Fix broken link on landing page', 'Customer reported a 404 error on the pricing page.', 'High', '2026-04-16', 'pending_confirmation');
}

const moksheetUser = db.prepare('SELECT * FROM users WHERE email = ?').get('moksheet77@gmail.com');
if (!moksheetUser) {
  const hashedPassword = bcrypt.hashSync('password123', 10);
  try {
    db.prepare('INSERT OR IGNORE INTO users (id, workspace_id, department_id, role_id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('u7', 'w1', null, null, 'Moksheet Shah', 'moksheet77@gmail.com', '7777777777', hashedPassword, 'Owner');
  } catch (e) {
    console.error('Failed to seed moksheet user:', e);
  }
}

export default db;
