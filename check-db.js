import Database from 'better-sqlite3';

const db = new Database('app.db');
const users = db.prepare('SELECT email, phone FROM users').all();
console.log(users);
