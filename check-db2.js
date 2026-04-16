import Database from 'better-sqlite3';

const db = new Database('app.db');
const user = db.prepare('SELECT password FROM users WHERE email = ?').get('admin@example.com');
console.log(user);
