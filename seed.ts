import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('app.db');

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

const targetEmail = 'moksheet77@gmail.com';
let user = db.prepare('SELECT id, workspace_id FROM users WHERE email = ?').get(targetEmail) as any;

if (!user) {
  const workspaceId = generateId('WS');
  const ownerId = generateId('USR');
  
  db.prepare('INSERT INTO workspaces (id, name) VALUES (?, ?)').run(workspaceId, 'FreshMart Supermarket');
  db.prepare('INSERT INTO users (id, workspace_id, name, email, password, role) VALUES (?, ?, ?, ?, ?, ?)').run(
    ownerId, workspaceId, 'Owner', targetEmail, bcrypt.hashSync('password123', 10), 'Owner'
  );
  
  user = { id: ownerId, workspace_id: workspaceId };
  console.log('Created owner user and workspace.');
}

if (user && user.workspace_id) {
  const workspaceId = user.workspace_id;
  const ownerId = user.id;

  console.log(`Seeding demo data for workspace ${workspaceId} (Owner: ${targetEmail})...`);

  // Update workspace name
  db.prepare('UPDATE workspaces SET name = ? WHERE id = ?').run('FreshMart Supermarket', workspaceId);

  // Clear existing data in this workspace (except the owner)
  db.prepare('DELETE FROM departments WHERE workspace_id = ?').run(workspaceId);
  db.prepare('DELETE FROM projects WHERE workspace_id = ?').run(workspaceId);
  db.prepare('DELETE FROM tasks WHERE workspace_id = ?').run(workspaceId);
  db.prepare('DELETE FROM users WHERE workspace_id = ? AND id != ?').run(workspaceId, ownerId);
  db.prepare('DELETE FROM users WHERE email IN (?, ?, ?, ?)').run('alice@freshmart.demo', 'bob@freshmart.demo', 'charlie@freshmart.demo', 'diana@freshmart.demo');

  // Create Departments
  const deptInventoryId = generateId('DEP');
  const deptSalesId = generateId('DEP');
  const deptLogisticsId = generateId('DEP');

  db.prepare('INSERT INTO departments (id, workspace_id, name) VALUES (?, ?, ?)').run(deptInventoryId, workspaceId, 'Inventory & Stock');
  db.prepare('INSERT INTO departments (id, workspace_id, name) VALUES (?, ?, ?)').run(deptSalesId, workspaceId, 'Sales & Customer Service');
  db.prepare('INSERT INTO departments (id, workspace_id, name) VALUES (?, ?, ?)').run(deptLogisticsId, workspaceId, 'Logistics & Delivery');

  // Create Employees
  const adminId = generateId('USR');
  const emp1Id = generateId('USR');
  const emp2Id = generateId('USR');
  const emp3Id = generateId('USR');

  db.prepare('INSERT INTO users (id, workspace_id, department_id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    adminId, workspaceId, null, 'Alice Admin', 'alice@freshmart.demo', '1234567890' + Math.floor(Math.random() * 1000), bcrypt.hashSync('password123', 10), 'Admin'
  );
  db.prepare('INSERT INTO users (id, workspace_id, department_id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    emp1Id, workspaceId, deptInventoryId, 'Bob Smith', 'bob@freshmart.demo', '1234567891' + Math.floor(Math.random() * 1000), bcrypt.hashSync('password123', 10), 'Manager'
  );
  db.prepare('INSERT INTO users (id, workspace_id, department_id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    emp2Id, workspaceId, deptSalesId, 'Charlie Davis', 'charlie@freshmart.demo', '1234567892' + Math.floor(Math.random() * 1000), bcrypt.hashSync('password123', 10), 'Employee'
  );
  db.prepare('INSERT INTO users (id, workspace_id, department_id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    emp3Id, workspaceId, deptLogisticsId, 'Diana Evans', 'diana@freshmart.demo', '1234567893' + Math.floor(Math.random() * 1000), bcrypt.hashSync('password123', 10), 'Employee'
  );

  // Update Department Managers
  db.prepare('UPDATE departments SET manager_id = ? WHERE id = ?').run(emp1Id, deptInventoryId);

  // Create Projects
  const projRestockId = generateId('PRJ');
  const projPromoId = generateId('PRJ');

  db.prepare('INSERT INTO projects (id, workspace_id, department_id, name, description) VALUES (?, ?, ?, ?, ?)').run(
    projRestockId, workspaceId, deptInventoryId, 'Weekly Restock', 'Manage weekly inventory restocking from suppliers.'
  );
  db.prepare('INSERT INTO projects (id, workspace_id, department_id, name, description) VALUES (?, ?, ?, ?, ?)').run(
    projPromoId, workspaceId, deptSalesId, 'Summer Promo Campaign', 'Prepare and execute the summer discount campaign.'
  );

  // Create Tasks
  const tasks = [
    {
      id: generateId('TSK'), project_id: projRestockId, title: 'Check Dairy Inventory', description: 'Count milk, cheese, and yogurt stock.',
      assigned_to_type: 'user', assigned_to_id: emp1Id, priority: 'High', status: 'Todo'
    },
    {
      id: generateId('TSK'), project_id: projRestockId, title: 'Order Fresh Produce', description: 'Place order for vegetables and fruits for next week.',
      assigned_to_type: 'user', assigned_to_id: emp1Id, priority: 'Urgent', status: 'In Progress'
    },
    {
      id: generateId('TSK'), project_id: projPromoId, title: 'Setup Promo Displays', description: 'Assemble the promotional cardboard displays in aisle 3.',
      assigned_to_type: 'user', assigned_to_id: emp2Id, priority: 'Medium', status: 'Todo'
    },
    {
      id: generateId('TSK'), project_id: projPromoId, title: 'Update Price Tags', description: 'Print and replace price tags for discounted items.',
      assigned_to_type: 'user', assigned_to_id: emp2Id, priority: 'High', status: 'Completed'
    },
    {
      id: generateId('TSK'), project_id: null, title: 'Deliver Groceries to 123 Main St', description: 'Customer order #45892.',
      assigned_to_type: 'user', assigned_to_id: emp3Id, priority: 'High', status: 'In Progress'
    }
  ];

  for (const task of tasks) {
    db.prepare(`
      INSERT INTO tasks (id, workspace_id, project_id, title, description, assigned_to_type, assigned_to_id, priority, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      task.id, workspaceId, task.project_id, task.title, task.description, task.assigned_to_type, task.assigned_to_id, task.priority, task.status, ownerId
    );
  }

  console.log('Demo data seeded successfully for moksheet77@gmail.com!');
} else {
  console.log('User not found or has no workspace.');
}
