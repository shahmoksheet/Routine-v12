const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Make all app.get, app.post, app.patch, app.delete callbacks async
code = code.replace(/app\.(get|post|patch|delete)\((.*?),\s*(authMiddleware,\s*)?(upload\.single\('.*?'\),\s*)?(async\s*)?\((req|req: AuthRequest),\s*res\)\s*=>\s*\{/g, 
  (match, method, path, auth, upload, isAsync, req) => {
    return `app.${method}(${path}, ${auth || ''}${upload || ''}async (${req}, res) => {`;
  }
);

// Also make io.on callbacks async if they contain db calls
code = code.replace(/socket\.on\('(.*?)',\s*(async\s*)?\((.*?)\)\s*=>\s*\{/g, 
  (match, event, isAsync, args) => {
    return `socket.on('${event}', async (${args}) => {`;
  }
);

// Make helper functions async
code = code.replace(/function logActivity\(/g, 'async function logActivity(');
code = code.replace(/function executeWorkflows\(/g, 'async function executeWorkflows(');

// Add await to logActivity and executeWorkflows calls
code = code.replace(/logActivity\(/g, 'await logActivity(');
code = code.replace(/executeWorkflows\(/g, 'await executeWorkflows(');
// Fix the function declarations that got await added
code = code.replace(/async function await logActivity\(/g, 'async function logActivity(');
code = code.replace(/async function await executeWorkflows\(/g, 'async function executeWorkflows(');

// Add await to db.prepare().get/all/run
code = code.replace(/db\.prepare\((.*?)\)\.(get|all|run)\((.*?)\)/g, 'await db.prepare($1).$2($3)');

// Handle cases where db.prepare is assigned to a variable
// e.g. const stmt = db.prepare('...'); stmt.run(...);
// This regex is a bit tricky, let's just do it for the known ones.
code = code.replace(/const insertMember = db\.prepare\((.*?)\);\s*for \((.*?)\) \{\s*if \((.*?)\) \{\s*insertMember\.run\((.*?)\);\s*\}\s*\}/g, 
  `const insertMember = db.prepare($1);\n      for ($2) {\n        if ($3) {\n          await insertMember.run($4);\n        }\n      }`
);

code = code.replace(/const stmt = db\.prepare\(([\s\S]*?)\);\s*stmt\.run\(([\s\S]*?)\);/g, 
  `const stmt = db.prepare($1);\n      await stmt.run($2);`
);

fs.writeFileSync('server.ts', code);
console.log('Migration script completed.');
