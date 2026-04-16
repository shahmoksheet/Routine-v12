import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('app.db');
db.pragma('journal_mode = WAL');

console.log('Starting force seed...');

// Clear existing data
db.exec('DELETE FROM tasks');
db.exec('DELETE FROM projects');
db.exec('DELETE FROM users');
db.exec('DELETE FROM roles');
db.exec('DELETE FROM departments');
db.exec('DELETE FROM workspaces');
db.exec('DELETE FROM invitations');
db.exec('DELETE FROM notifications');
db.exec('DELETE FROM activity_logs');
db.exec('DELETE FROM time_logs');

const hashedPassword = bcrypt.hashSync('password123', 10);

// Workspaces
db.prepare('INSERT INTO workspaces (id, name, owner_id, subscription_plan) VALUES (?, ?, ?, ?)').run('w1', 'FreshMart Global', 'u7', 'Enterprise');
db.prepare('INSERT INTO workspaces (id, name, owner_id, subscription_plan) VALUES (?, ?, ?, ?)').run('w2', 'FreshMart Warehouse', 'u7', 'Pro');

// Departments
db.prepare('INSERT INTO departments (id, workspace_id, name, manager_id) VALUES (?, ?, ?, ?)').run('d1', 'w1', 'Head Office', 'u3');
db.prepare('INSERT INTO departments (id, workspace_id, name, manager_id) VALUES (?, ?, ?, ?)').run('d2', 'w1', 'Sales & Retail', 'u5');
db.prepare('INSERT INTO departments (id, workspace_id, name, manager_id) VALUES (?, ?, ?, ?)').run('d3', 'w1', 'Logistics', 'u9');
db.prepare('INSERT INTO departments (id, workspace_id, name, manager_id) VALUES (?, ?, ?, ?)').run('d4', 'w1', 'Inventory', 'u11');

// Roles
db.prepare('INSERT INTO roles (id, workspace_id, department_id, name, permissions, color) VALUES (?, ?, ?, ?, ?, ?)').run('r1', 'w1', 'd1', 'Admin', '["manage_members","manage_roles","manage_departments","manage_projects","view_projects","manage_tasks","create_tasks","approve_tasks","manage_chat","use_ai","view_reports","view_audit_logs","switch_workspace"]', '#4f46e5');
db.prepare('INSERT INTO roles (id, workspace_id, department_id, name, permissions, color) VALUES (?, ?, ?, ?, ?, ?)').run('r2', 'w1', 'd2', 'Store Manager', '["view_tasks", "create_tasks", "update_tasks", "approve_tasks"]', '#ec4899');
db.prepare('INSERT INTO roles (id, workspace_id, department_id, name, permissions, color) VALUES (?, ?, ?, ?, ?, ?)').run('r3', 'w1', 'd3', 'Logistics Coordinator', '["view_tasks", "create_tasks", "update_tasks"]', '#f59e0b');
db.prepare('INSERT INTO roles (id, workspace_id, department_id, name, permissions, color) VALUES (?, ?, ?, ?, ?, ?)').run('r4', 'w1', 'd2', 'Sales Associate', '["view_tasks", "update_tasks"]', '#10b981');

// Users
const insertUser = db.prepare('INSERT INTO users (id, workspace_id, department_id, role_id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
insertUser.run('u7', 'w1', null, null, 'Moksheet Shah', 'moksheet77@gmail.com', '7777777777', hashedPassword, 'Owner');
insertUser.run('u8', 'w1', 'd1', 'r1', 'Sarah Chen', 'sarah@globaltech.demo', '8888888888', hashedPassword, 'Admin');
insertUser.run('u3', 'w1', 'd1', 'r2', 'David Miller', 'david@globaltech.demo', '1111111111', hashedPassword, 'Manager');
insertUser.run('u5', 'w1', 'd2', 'r2', 'Elena Rodriguez', 'elena@globaltech.demo', '2222222222', hashedPassword, 'Manager');
insertUser.run('u9', 'w1', 'd3', 'r3', 'James Wilson', 'james@globaltech.demo', '3333333333', hashedPassword, 'Manager');
insertUser.run('u11', 'w1', 'd4', 'r3', 'Michael Scott', 'michael@globaltech.demo', '4444444444', hashedPassword, 'Manager');
insertUser.run('u4', 'w1', 'd1', 'r4', 'Linda Park', 'linda@globaltech.demo', '5555555555', hashedPassword, 'Employee');
insertUser.run('u6', 'w1', 'd2', 'r4', 'Tom Harris', 'tom@globaltech.demo', '6666666666', hashedPassword, 'Employee');
insertUser.run('u10', 'w1', 'd3', 'r4', 'Robert Brown', 'robert@globaltech.demo', '0000000000', hashedPassword, 'Employee');

// Projects
const insertProject = db.prepare('INSERT INTO projects (id, workspace_id, department_id, name, description, kanban_columns) VALUES (?, ?, ?, ?, ?, ?)');
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

// Tasks
const insertTask = db.prepare('INSERT INTO tasks (id, workspace_id, project_id, title, description, assigned_to_type, assigned_to_id, priority, status, due_date, proof_type, recurring_rule, time_spent, comments, subtasks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

// Store Expansion Tasks
insertTask.run('t1', 'w1', 'p1', 'Finalize Lease for Downtown Site', 'Review legal documents and sign the lease', 'user', 'u8', 'Critical', 'In Progress', '2026-04-20', 'None', null, 0, JSON.stringify([]), JSON.stringify([]), 'u7');
insertTask.run('t2', 'w1', 'p1', 'Hire Store Staff', 'Interview and hire 10 new associates', 'user', 'u3', 'High', 'Todo', '2026-05-15', 'None', null, 0, JSON.stringify([]), JSON.stringify([]), 'u8');

// Holiday Sale Tasks
insertTask.run('t3', 'w1', 'p2', 'Order Seasonal Inventory', 'Place orders for holiday-themed products', 'user', 'u5', 'High', 'In Progress', '2026-04-18', 'None', null, 0, JSON.stringify([]), JSON.stringify([]), 'u8');
insertTask.run('t4', 'w1', 'p2', 'Design Sale Banners', 'Create visual assets for store-front and online', 'user', 'u4', 'Medium', 'Todo', '2026-04-25', 'Image', null, 0, JSON.stringify([]), JSON.stringify([]), 'u5');

// Logistics Tasks
insertTask.run('t5', 'w1', 'p3', 'Route Optimization for Delivery', 'Analyze and improve delivery routes', 'user', 'u9', 'Medium', 'In Progress', '2026-04-22', 'None', null, 0, JSON.stringify([]), JSON.stringify([]), 'u9');
insertTask.run('t6', 'w1', 'p3', 'Inventory Audit - Section A', 'Perform a full count of stock in Section A', 'user', 'u11', 'High', 'Todo', '2026-04-19', 'Image', 'Monthly', 0, JSON.stringify([]), JSON.stringify([]), 'u11');

// Employee Tasks
insertTask.run('t7', 'w1', 'p2', 'Stock Replenishment - Outlet 1', 'Restock shelves for the morning shift', 'user', 'u6', 'Medium', 'Todo', '2026-04-15', 'None', 'Daily', 0, JSON.stringify([]), JSON.stringify([]), 'u5');
insertTask.run('t8', 'w1', 'p3', 'Delivery Schedule Update', 'Update the master delivery schedule for next week', 'user', 'u10', 'Low', 'Todo', '2026-04-17', 'None', null, 0, JSON.stringify([]), JSON.stringify([]), 'u9');

// Team Chat Groups & Messages
db.exec('DELETE FROM groups');
db.exec('DELETE FROM group_members');
db.exec('DELETE FROM messages');

const g1 = 'g1';
db.prepare('INSERT INTO groups (id, workspace_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)').run(g1, 'w1', 'Management Sync', 'Daily sync for managers and owners', 'u7');
db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(g1, 'u7', 'admin');
db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(g1, 'u8', 'member');
db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(g1, 'u3', 'member');
db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(g1, 'u5', 'member');

const g2 = 'g2';
db.prepare('INSERT INTO groups (id, workspace_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)').run(g2, 'w1', 'Store Operations', 'General store operations and announcements', 'u8');
db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(g2, 'u8', 'admin');
db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(g2, 'u5', 'member');
db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(g2, 'u6', 'member');
db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(g2, 'u11', 'member');

const insertMsg = db.prepare('INSERT INTO messages (id, workspace_id, sender_id, group_id, message) VALUES (?, ?, ?, ?, ?)');
insertMsg.run('m1', 'w1', 'u7', g1, 'Good morning team. Sarah, how is the downtown lease coming along?');
insertMsg.run('m2', 'w1', 'u8', g1, 'Hi Moksheet, I\'m reviewing the final draft now. Should be ready for signature by EOD.');
insertMsg.run('m3', 'w1', 'u3', g1, 'I\'ve started the initial screening for the store staff.');
insertMsg.run('m4', 'w1', 'u8', g2, 'Team, please ensure all seasonal inventory is logged by Friday.');
insertMsg.run('m5', 'w1', 'u11', g2, 'On it, Sarah. Michael Scott here, I\'ll oversee the audit.');

console.log('Force seed completed successfully.');
process.exit(0);
