import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import db from './server/db.ts';
import { authMiddleware } from './server/middleware/auth.ts';
import type { AuthRequest } from './server/middleware/auth.ts';
import { GoogleGenAI } from '@google/genai';
import bcrypt from 'bcryptjs';

function generateId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

let aiClient: GoogleGenAI | null = null;
function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyB4N1KHI1daTv9UAvX1Ibv2qFLqZBZSIeY';
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: '*' }
  });

  app.use(express.json());
  app.use(cookieParser());

  // HEALTH CHECK
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join_room', async (room) => {
      socket.join(room);
      console.log(`User joined room: ${room}`);
    });

    socket.on('chat_message', async (msg) => {
      const { sender_id, receiver_id, group_id, message, attachment, workspace_id } = msg;
      const id = generateId('MSG');
      
      db.prepare('INSERT INTO messages (id, workspace_id, sender_id, receiver_id, group_id, message, attachment) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, workspace_id || null, sender_id, receiver_id || null, group_id || null, message, attachment || null);

      const savedMsg = { ...msg, id, timestamp: new Date().toISOString() };

      if (group_id) {
        io.to(`group_${group_id}`).emit('chat_message', savedMsg);
        
        // Handle tagging
        const groupMembers = await db.prepare('SELECT u.id, u.name FROM users u JOIN group_members gm ON u.id = gm.user_id WHERE gm.group_id = ?').all(group_id) as any[];
        const sender = await db.prepare('SELECT name FROM users WHERE id = ?').get(sender_id) as any;
        const group = await db.prepare('SELECT name FROM groups WHERE id = ?').get(group_id) as any;
        
        groupMembers.forEach(member => {
          if (member.id !== sender_id && message.includes(`@${member.name}`)) {
            const notifId = generateId('NOT');
            db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
              .run(notifId, member.id, 'You were mentioned', `${sender?.name || 'Someone'} mentioned you in ${group?.name || 'a group'}`, 'mention');
            io.to(`user_${member.id}`).emit('notification', { id: notifId, title: 'You were mentioned', message: `${sender?.name || 'Someone'} mentioned you in ${group?.name || 'a group'}` });
          }
        });
      } else if (receiver_id) {
        io.to(`user_${receiver_id}`).to(`user_${sender_id}`).emit('chat_message', savedMsg);
      } else {
        io.emit('chat_message', savedMsg);
      }
    });

    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // --- FILE UPLOAD API ---
  app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: filePath });
  });

  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // --- HEALTH CHECK ---
  app.get('/api/health', async (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // --- AUTH API ---
  app.get('/api/auth/me', authMiddleware, async (req: AuthRequest, res) => {
    const { id } = req.user!;
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        roleId: user.role_id,
        workspaceId: user.workspace_id,
        departmentId: user.department_id,
        language: user.language,
        themeColor: user.theme_color,
        isDarkMode: user.is_dark_mode === 1,
        kanbanColumns: user.kanban_columns
      }
    });
  });

  app.post('/api/auth/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

    try {
      const user = await db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
      const id = generateId('OTP');

      await db.prepare('INSERT INTO otps (id, phone, code, expires_at) VALUES (?, ?, ?, ?)').run(id, phone, code, expiresAt);

      console.log(`OTP for ${phone}: ${code}`); // For demo, log it
      res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, phone, password, isOtp, otp } = req.body;
      
      let user;
      if (phone && isOtp) {
        user = await db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;
      } else {
        user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      }
      
      let isValidPassword = false;
      if (user) {
        if (isOtp) {
          if (!otp) return res.status(400).json({ success: false, message: 'OTP required' });
          
          const validOtp = db.prepare('SELECT * FROM otps WHERE phone = ? AND code = ? AND expires_at > ?')
            .get(phone, otp, new Date().toISOString()) as any;
          
          if (validOtp) {
            isValidPassword = true;
            // Delete OTP after use
            await db.prepare('DELETE FROM otps WHERE id = ?').run(validOtp.id);
          } else {
            return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
          }
        } else if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
          isValidPassword = bcrypt.compareSync(password, user.password);
        } else if (user.password) {
          isValidPassword = password === user.password;
          if (isValidPassword) {
            // Upgrade to hashed password
            const newHash = bcrypt.hashSync(password, 10);
            await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, user.id);
          }
        }
      }

      if (user && isValidPassword) {
        const payload = {
          id: user.id,
          role: user.role,
          roleId: user.role_id,
          workspaceId: user.workspace_id,
          departmentId: user.department_id
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
        
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ 
          success: true, 
          token,
          user: { 
            id: user.id, 
            name: user.name, 
            email: user.email, 
            role: user.role,
            roleId: user.role_id,
            workspaceId: user.workspace_id,
            departmentId: user.department_id,
            themeColor: user.theme_color,
            isDarkMode: user.is_dark_mode === 1,
            kanbanColumns: user.kanban_columns
          } 
        });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  app.post('/api/auth/invite', async (req, res) => {
    const { name, email, phone, password, inviteCode } = req.body;
    try {
      const invite = await db.prepare('SELECT * FROM invitations WHERE code = ? AND email = ?').get(inviteCode, email) as any;
      if (!invite) {
        return res.status(400).json({ success: false, message: 'Invalid invite code or email' });
      }

      const id = generateId('USR');
      const hashedPassword = bcrypt.hashSync(password, 10);
      const stmt = db.prepare('INSERT INTO users (id, workspace_id, name, email, phone, password, role, role_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      await stmt.run(id, invite.workspace_id, name, email, phone, hashedPassword, invite.role, invite.role_id || null);
      
      // Delete invitation
      await db.prepare('DELETE FROM invitations WHERE id = ?').run(invite.id);
      
      const payload = { id, role: invite.role, workspaceId: invite.workspace_id, departmentId: null };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({ 
        success: true, 
        token,
        user: { 
          id, 
          name, 
          email, 
          role: invite.role,
          workspaceId: invite.workspace_id,
          departmentId: null,
          themeColor: 'indigo',
          isDarkMode: false
        } 
      });
    } catch (err: any) {
      console.error('Invite error:', err);
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ success: false, message: 'Email or phone already exists' });
      }
      res.status(400).json({ success: false, message: 'Failed to create account' });
    }
  });

  app.post('/api/auth/signup', async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
      const id = generateId('USR');
      const workspaceId = generateId('WS');
      const hashedPassword = bcrypt.hashSync(password, 10);
      
      // Create default workspace
      db.prepare('INSERT INTO workspaces (id, name, owner_id, subscription_plan) VALUES (?, ?, ?, ?)').run(
        workspaceId, `${name}'s Workspace`, id, 'Free'
      );
      
      const stmt = db.prepare('INSERT INTO users (id, workspace_id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?, ?)');
      await stmt.run(id, workspaceId, name, email, phone, hashedPassword, 'Owner'); // Default to Owner for new signups
      
      const payload = { id, role: 'Owner', workspaceId, departmentId: null };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.json({ 
        success: true, 
        token,
        user: { 
          id, 
          name, 
          email, 
          role: 'Owner',
          workspaceId,
          departmentId: null,
          themeColor: 'indigo',
          isDarkMode: false
        } 
      });
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ success: false, message: 'Email or phone already exists' });
      }
      res.status(400).json({ success: false, message: 'Failed to create account' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  // --- WHATSAPP WEBHOOK API ---
  app.get('/api/webhooks/whatsapp', async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN || 'routine_whatsapp_token')) {
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  });

  app.post('/api/webhooks/whatsapp', async (req, res) => {
    const body = req.body;

    if (body.object) {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
        const phoneNumber = body.entry[0].changes[0].value.messages[0].from;
        const message = body.entry[0].changes[0].value.messages[0];
        
        // Find user by phone number
        const user = await db.prepare('SELECT * FROM users WHERE phone = ?').get(phoneNumber) as any;
        
        if (!user) {
          console.log(`WhatsApp message from unknown number: ${phoneNumber}`);
          return res.sendStatus(200);
        }

        if (message.type === 'text') {
          const text = message.text.body;
          
          try {
            // Parse with Gemini
            const aiResponse = await getAiClient().models.generateContent({
              model: "gemini-3-flash-preview",
              contents: `Parse the following task request into a structured JSON object. 
              The user wants to create a task. Extract:
              - title (string)
              - description (string)
              - priority (string: High, Medium, Low)
              - due_date (YYYY-MM-DD format, or null). Note: Date is optional, some tasks like AC repairing depend on 3rd party availability and won't have a date.
              - due_time (HH:MM format, or null). Note: Time is optional.
              - assignee_name (string, or null)
              - is_ambiguous (boolean: true if the request is too vague to create a task)
              - language (string: the language code of the user's message, e.g., "en", "hi", "es")
              
              Message: "${text}"
              
              Return ONLY valid JSON.`,
              config: {
                responseMimeType: "application/json"
              }
            });
            
            const parsedTask = JSON.parse(aiResponse.text || '{}');
            
            if (parsedTask.is_ambiguous) {
              console.log(`Ambiguous WhatsApp message from ${phoneNumber}. Asking for clarification in ${parsedTask.language}.`);
              // Send clarifying message back to WhatsApp
              return res.sendStatus(200);
            }

            // Try to find assignee by name
            let assignedToId = null;
            if (parsedTask.assignee_name) {
              const assignee = await db.prepare('SELECT id FROM users WHERE workspace_id = ? AND name LIKE ?').get(user.workspace_id, `%${parsedTask.assignee_name}%`) as any;
              if (assignee) {
                assignedToId = assignee.id;
              }
            }
            
            const draftId = generateId('DRF');
            
            db.prepare(`
              INSERT INTO draft_tasks 
              (id, phone_number, workspace_id, created_by, title, description, assigned_to_id, due_date, due_time, priority) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              draftId, phoneNumber, user.workspace_id, user.id, 
              parsedTask.title || text, 
              parsedTask.description || '', 
              assignedToId, 
              parsedTask.due_date || null, 
              parsedTask.due_time || null, 
              parsedTask.priority || 'Medium'
            );
            
            console.log(`Created draft task ${draftId} for ${phoneNumber}`);
            
            if (parsedTask.priority === 'High') {
              console.log(`High priority task ${draftId} requires in-app confirmation from a manager.`);
              // Send message to WhatsApp: "High priority tasks require manager confirmation in the app."
            } else {
              // Send confirmation message back to WhatsApp (Mocked)
              // axios.post('https://graph.facebook.com/v17.0/PHONE_NUMBER_ID/messages', { ... })
            }
            
          } catch (error) {
            console.error('Error parsing WhatsApp message:', error);
          }
        } else if (message.type === 'interactive') {
          const interactive = message.interactive;
          if (interactive.type === 'button_reply') {
            const buttonId = interactive.button_reply.id;
            
            if (buttonId.startsWith('confirm_task_')) {
              const draftId = buttonId.replace('confirm_task_', '');
              const draft = await db.prepare('SELECT * FROM draft_tasks WHERE id = ?').get(draftId) as any;
              
              if (draft && draft.status === 'pending_confirmation') {
                const taskId = generateId('TSK');
                
                // Create actual task
                db.prepare(`
                  INSERT INTO tasks 
                  (id, workspace_id, title, description, assigned_to_type, assigned_to_id, priority, status, due_date, due_time, created_by) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                  taskId, draft.workspace_id, draft.title, draft.description, 
                  draft.assigned_to_id ? 'user' : null, draft.assigned_to_id, 
                  draft.priority, 'Todo', draft.due_date, draft.due_time, draft.created_by
                );
                
                // Update draft status
                await db.prepare('UPDATE draft_tasks SET status = ? WHERE id = ?').run('confirmed', draftId);
                
                console.log(`Confirmed and created task ${taskId} from draft ${draftId}`);
              }
            } else if (buttonId.startsWith('cancel_task_')) {
              const draftId = buttonId.replace('cancel_task_', '');
              await db.prepare('UPDATE draft_tasks SET status = ? WHERE id = ?').run('cancelled', draftId);
              console.log(`Cancelled draft task ${draftId}`);
            }
          }
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });

  // Apply auth middleware to all /api routes except auth, health, and webhooks
  app.use('/api', authMiddleware);

  // --- USER PREFERENCES ---
  app.patch('/api/users/preferences', authMiddleware, async (req: AuthRequest, res) => {
    const { id } = req.user!;
    const { themeColor, isDarkMode, workspaceId, departmentId, name, language, kanbanColumns } = req.body;
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (themeColor !== undefined) { updates.push('theme_color = ?'); params.push(themeColor); }
    if (isDarkMode !== undefined) { updates.push('is_dark_mode = ?'); params.push(isDarkMode ? 1 : 0); }
    if (workspaceId !== undefined) { updates.push('workspace_id = ?'); params.push(workspaceId); }
    if (departmentId !== undefined) { updates.push('department_id = ?'); params.push(departmentId); }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (language !== undefined) { updates.push('language = ?'); params.push(language); }
    if (kanbanColumns !== undefined) { 
      updates.push('kanban_columns = ?'); 
      params.push(typeof kanbanColumns === 'string' ? kanbanColumns : JSON.stringify(kanbanColumns)); 
    }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
    
    params.push(id);
    
    try {
      await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      const updatedUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
      res.json({
        success: true,
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          workspaceId: updatedUser.workspace_id,
          departmentId: updatedUser.department_id,
          language: updatedUser.language,
          themeColor: updatedUser.theme_color,
          isDarkMode: updatedUser.is_dark_mode === 1,
          kanbanColumns: updatedUser.kanban_columns
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  // --- WORKSPACES API ---
  app.get('/api/workspaces', async (req: AuthRequest, res) => {
    const { id: userId, role } = req.user!;
    const showDeactivated = req.query.showDeactivated === 'true';
    
    let query = 'SELECT * FROM workspaces';
    let params: any[] = [];
    let whereClauses = [];
    
    if (role !== 'Owner') {
      const user = await db.prepare('SELECT workspace_id FROM users WHERE id = ?').get(userId) as any;
      if (user && user.workspace_id) {
        whereClauses.push('id = ?');
        params.push(user.workspace_id);
      } else {
        return res.json([]);
      }
    } else {
      whereClauses.push('owner_id = ?');
      params.push(userId);
    }
    
    if (!showDeactivated) {
      whereClauses.push('is_deactivated = 0');
    }
    
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    const workspaces = await db.prepare(query).all(...params);
    res.json(workspaces);
  });

  app.post('/api/workspaces/:id/deactivate', async (req: AuthRequest, res) => {
    const { id: userId, role } = req.user!;
    const { id } = req.params;
    const workspace = await db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as any;
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (workspace.owner_id !== userId && role !== 'Owner') return res.status(403).json({ error: 'Forbidden' });
    
    await db.prepare('UPDATE workspaces SET is_deactivated = 1 WHERE id = ?').run(id);
    res.json({ success: true });
  });

  app.post('/api/workspaces/:id/activate', async (req: AuthRequest, res) => {
    const { id: userId, role } = req.user!;
    const { id } = req.params;
    const workspace = await db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as any;
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (workspace.owner_id !== userId && role !== 'Owner') return res.status(403).json({ error: 'Forbidden' });
    
    await db.prepare('UPDATE workspaces SET is_deactivated = 0 WHERE id = ?').run(id);
    res.json({ success: true });
  });

  app.post('/api/workspaces', async (req: AuthRequest, res) => {
    const { id: userId, role } = req.user!;
    console.log('Workspace creation attempt:', { userId, role, body: req.body });
    
    if (role !== 'Owner') {
      console.warn('Workspace creation forbidden: User role is', role);
      return res.status(403).json({ error: 'Forbidden: Only Owners can create workspaces' });
    }
    
    const { id, name, subscriptionPlan, org_type } = req.body;
    const workspaceId = id || generateId('WS');
    const orgType = org_type || 'hierarchical';
    
    try {
      db.prepare('INSERT INTO workspaces (id, name, owner_id, subscription_plan, org_type) VALUES (?, ?, ?, ?, ?)')
        .run(workspaceId, name, userId, subscriptionPlan || 'Free', orgType);
      
      // If user doesn't have a workspace, assign them to this one
      const user = await db.prepare('SELECT workspace_id FROM users WHERE id = ?').get(userId) as any;
      if (user && !user.workspace_id) {
        await db.prepare('UPDATE users SET workspace_id = ? WHERE id = ?').run(workspaceId, userId);
      }
      
      console.log('Workspace created successfully:', workspaceId);
      res.json({ success: true, id: workspaceId });
    } catch (error) {
      console.error('Failed to add workspace:', error);
      res.status(500).json({ error: 'Failed to add workspace: ' + (error instanceof Error ? error.message : String(error)) });
    }
  });

  app.patch('/api/workspaces/:id', async (req: AuthRequest, res) => {
    const { id: userId, role } = req.user!;
    const { id } = req.params;
    const { name, subscriptionPlan, subscriptionStatus } = req.body;
    
    const workspace = await db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as any;
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (workspace.owner_id !== userId && role !== 'Owner') return res.status(403).json({ error: 'Forbidden' });
    
    const updates: string[] = [];
    const params: any[] = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (subscriptionPlan) { updates.push('subscription_plan = ?'); params.push(subscriptionPlan); }
    if (subscriptionStatus) { updates.push('subscription_status = ?'); params.push(subscriptionStatus); }
    
    if (updates.length > 0) {
      params.push(id);
      await db.prepare(`UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }
    res.json({ success: true });
  });

  app.delete('/api/workspaces/:id', async (req: AuthRequest, res) => {
    const { id: userId, role } = req.user!;
    const { id } = req.params;
    
    const workspace = await db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as any;
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    if (workspace.owner_id !== userId && role !== 'Owner') return res.status(403).json({ error: 'Forbidden' });
    
    // Check for active members (other than the owner)
    const membersCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE workspace_id = ? AND id != ?').get(id, userId) as any;
    if (membersCount.count > 0) {
      return res.status(400).json({ error: `Cannot delete workspace. It has ${membersCount.count} active members. Please remove them first.` });
    }

    // Check for active tasks
    const tasksCount = await db.prepare('SELECT COUNT(*) as count FROM tasks WHERE workspace_id = ?').get(id) as any;
    if (tasksCount.count > 0) {
      return res.status(400).json({ error: `Cannot delete workspace. It has ${tasksCount.count} tasks. Please delete them first.` });
    }

    // Delete workspace and cascade manually
    await db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
    await db.prepare('DELETE FROM departments WHERE workspace_id = ?').run(id);
    await db.prepare('DELETE FROM projects WHERE workspace_id = ?').run(id);
    await db.prepare('DELETE FROM tasks WHERE workspace_id = ?').run(id);
    await db.prepare('DELETE FROM invitations WHERE workspace_id = ?').run(id);
    await db.prepare('DELETE FROM groups WHERE workspace_id = ?').run(id);
    await db.prepare('DELETE FROM messages WHERE workspace_id = ?').run(id);
    await db.prepare('DELETE FROM activity_logs WHERE workspace_id = ?').run(id);
    
    // Set users' workspace_id to null if they belong to this workspace
    await db.prepare('UPDATE users SET workspace_id = NULL WHERE workspace_id = ?').run(id);
    
    res.json({ success: true });
  });

  // --- DEPARTMENTS API ---
  app.get('/api/departments', async (req: AuthRequest, res) => {
    const { workspaceId } = req.user!;
    const departments = await db.prepare('SELECT * FROM departments WHERE workspace_id = ?').all(workspaceId);
    res.json(departments);
  });

  app.post('/api/departments', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    const { id, name, managerId } = req.body;
    const deptId = id || generateId('DEP');
    db.prepare('INSERT INTO departments (id, workspace_id, name, manager_id) VALUES (?, ?, ?, ?)')
      .run(deptId, workspaceId, name, managerId || null);
    
    io.emit('department_created', { id: deptId, workspaceId });
    res.json({ success: true });
  });

  app.patch('/api/departments/:id', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    const { name, managerId } = req.body;
    
    const dept = await db.prepare('SELECT * FROM departments WHERE id = ? AND workspace_id = ?').get(id, workspaceId);
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    const updates: string[] = [];
    const params: any[] = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (managerId !== undefined) { updates.push('manager_id = ?'); params.push(managerId); }
    
    if (updates.length > 0) {
      params.push(id);
      await db.prepare(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      io.emit('department_updated', { id, workspaceId });
    }
    res.json({ success: true });
  });

  app.delete('/api/departments/:id', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    // Check for associated members
    const membersCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE department_id = ? AND workspace_id = ?').get(id, workspaceId) as any;
    if (membersCount.count > 0) {
      return res.status(400).json({ error: `Cannot delete department. It has ${membersCount.count} associated members. Please reassign them first.` });
    }

    // Check for associated projects
    const projectsCount = await db.prepare('SELECT COUNT(*) as count FROM projects WHERE department_id = ? AND workspace_id = ?').get(id, workspaceId) as any;
    if (projectsCount.count > 0) {
      return res.status(400).json({ error: `Cannot delete department. It has ${projectsCount.count} associated projects. Please reassign them first.` });
    }

    await db.prepare('DELETE FROM departments WHERE id = ? AND workspace_id = ?').run(id, workspaceId);
    io.emit('department_deleted', { id, workspaceId });
    res.json({ success: true });
  });

  // --- PROJECTS API ---
  app.get('/api/projects', async (req: AuthRequest, res) => {
    const { workspaceId } = req.user!;
    const projects = await db.prepare('SELECT * FROM projects WHERE workspace_id = ?').all(workspaceId).map((p: any) => ({
      ...p,
      title: p.name,
      kanbanColumns: JSON.parse(p.kanban_columns || '[]'),
      departmentIds: JSON.parse(p.department_ids || '[]')
    }));
    res.json(projects);
  });

  app.post('/api/projects', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    if (!['Owner', 'Admin', 'Manager'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    const { id, name, description, departmentId, departmentIds, kanbanColumns } = req.body;
    const projectId = id || generateId('PRJ');
    
    // If departmentIds is provided, use it. Otherwise, fallback to departmentId (legacy)
    let finalDepartmentIds = departmentIds || [];
    if (finalDepartmentIds.length === 0 && departmentId) {
      finalDepartmentIds = [departmentId];
    }
    
    db.prepare('INSERT INTO projects (id, workspace_id, department_id, department_ids, name, description, kanban_columns) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(projectId, workspaceId, departmentId || null, JSON.stringify(finalDepartmentIds), name, description || null, JSON.stringify(kanbanColumns || []));
    
    io.emit('project_created', { id: projectId, workspaceId });
    res.json({ success: true });
  });

  app.patch('/api/projects/:id', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    const { name, description, departmentId, departmentIds, kanbanColumns } = req.body;
    
    const project = await db.prepare('SELECT * FROM projects WHERE id = ? AND workspace_id = ?').get(id, workspaceId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!['Owner', 'Admin', 'Manager'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    const updates: string[] = [];
    const params: any[] = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (departmentId !== undefined) { updates.push('department_id = ?'); params.push(departmentId); }
    if (departmentIds !== undefined) { updates.push('department_ids = ?'); params.push(JSON.stringify(departmentIds)); }
    if (kanbanColumns !== undefined) { updates.push('kanban_columns = ?'); params.push(JSON.stringify(kanbanColumns)); }
    
    if (updates.length > 0) {
      params.push(id);
      await db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      io.emit('project_updated', { id, workspaceId });
    }
    res.json({ success: true });
  });

  app.delete('/api/projects/:id', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    // Check for active tasks
    const tasksCount = await db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ? AND workspace_id = ? AND status != "Completed"').get(id, workspaceId) as any;
    if (tasksCount.count > 0) {
      return res.status(400).json({ error: `Cannot delete project. It has ${tasksCount.count} active tasks. Please complete or delete them first.` });
    }

    await db.prepare('DELETE FROM projects WHERE id = ? AND workspace_id = ?').run(id, workspaceId);
    io.emit('project_deleted', { id, workspaceId });
    res.json({ success: true });
  });

  // --- USERS / TEAM API ---
  app.get('/api/users', async (req: AuthRequest, res) => {
    const { workspaceId, role, departmentId } = req.user!;
    const showDeleted = req.query.showDeleted === 'true';
    const showDeactivated = req.query.showDeactivated === 'true';
    
    let query = 'SELECT id, name, email, phone, role, workspace_id, department_id, department_ids, manager_id, is_deleted, is_deactivated FROM users';
    let params: any[] = [];
    
    let whereClauses = [];
    if (role === 'Owner') {
      whereClauses.push('(workspace_id = ? OR workspace_id IS NULL)');
      params.push(workspaceId);
    } else {
      whereClauses.push('workspace_id = ?');
      params.push(workspaceId);
    }
    
    if (!showDeleted) {
      whereClauses.push('is_deleted = 0');
    }
    if (!showDeactivated) {
      whereClauses.push('is_deactivated = 0');
    }
    
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    let users = await db.prepare(query).all(...params);
    // Filter by role
    if (role === 'Manager' && departmentId) {
      // Manager sees their department's users
      users = users.filter((u: any) => u.department_id === departmentId || u.id === req.user!.id);
    } else if (role === 'Employee') {
      // Employees see everyone in their workspace (for chat/assignment)
      // No extra filtering needed for now, but could be restricted if needed
    }
    
    res.json(users);
  });

  app.post('/api/users', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    const { id, name, email, phone, password, role: userRole, roleId, departmentId, departmentIds, managerId } = req.body;
    const userId = id || generateId('USR');
    const hashedPassword = bcrypt.hashSync(password || 'password123', 10);
    try {
      db.prepare('INSERT INTO users (id, workspace_id, department_id, department_ids, role_id, name, email, phone, password, role, manager_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(userId, workspaceId, departmentId || null, JSON.stringify(departmentIds || []), roleId || null, name, email, phone || null, hashedPassword, userRole, managerId || null);
      io.emit('user_created', { id: userId, workspaceId });
      res.json({ success: true, id: userId });
    } catch (err) {
      res.status(400).json({ error: 'User already exists' });
    }
  });

  app.patch('/api/users/:id', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    const { name, email, phone, password, role: userRole, roleId, departmentId, departmentIds, managerId } = req.body;
    
    if (!['Owner', 'Admin'].includes(role) && id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
    
    const updates: string[] = [];
    const params: any[] = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (phone) { updates.push('phone = ?'); params.push(phone); }
    if (password) { updates.push('password = ?'); params.push(bcrypt.hashSync(password, 10)); }
    if (userRole && ['Owner', 'Admin'].includes(role)) { updates.push('role = ?'); params.push(userRole); }
    if (roleId !== undefined) { updates.push('role_id = ?'); params.push(roleId); }
    if (departmentId !== undefined) { updates.push('department_id = ?'); params.push(departmentId); }
    if (departmentIds !== undefined) { updates.push('department_ids = ?'); params.push(JSON.stringify(departmentIds)); }
    if (managerId !== undefined) { updates.push('manager_id = ?'); params.push(managerId); }
    
    if (updates.length > 0) {
      params.push(id);
      await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      io.emit('user_updated', { id, workspaceId });
    }
    res.json({ success: true });
  });

  app.delete('/api/users/:id', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    // Check for active tasks assigned to this user
    const tasks = await db.prepare('SELECT assignees FROM tasks WHERE workspace_id = ? AND status != "Completed"').all(workspaceId) as any[];
    const activeTasksCount = tasks.filter(t => {
      try {
        const assignees = JSON.parse(t.assignees || '[]');
        return assignees.includes(id);
      } catch (e) {
        return false;
      }
    }).length;

    if (activeTasksCount > 0) {
      return res.status(400).json({ error: `Cannot remove member. They have ${activeTasksCount} active tasks. Please reassign them first.` });
    }

    await db.prepare('UPDATE users SET is_deleted = 1 WHERE id = ? AND workspace_id = ?').run(id, workspaceId);
    io.emit('user_deleted', { id, workspaceId });
    res.json({ success: true });
  });

  app.post('/api/users/:id/deactivate', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    await db.prepare('UPDATE users SET is_deactivated = 1 WHERE id = ? AND workspace_id = ?').run(id, workspaceId);
    io.emit('user_updated', { id, workspaceId });
    res.json({ success: true });
  });

  app.post('/api/users/:id/activate', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    await db.prepare('UPDATE users SET is_deactivated = 0 WHERE id = ? AND workspace_id = ?').run(id, workspaceId);
    io.emit('user_updated', { id, workspaceId });
    res.json({ success: true });
  });

  app.post('/api/users/:id/restore', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    await db.prepare('UPDATE users SET is_deleted = 0 WHERE id = ? AND workspace_id = ?').run(id, workspaceId);
    io.emit('user_updated', { id, workspaceId });
    res.json({ success: true });
  });

  // --- CHAT API ---
  app.get('/api/groups', async (req: AuthRequest, res) => {
    const { workspaceId, id: userId } = req.user!;
    const groups = db.prepare(`
      SELECT g.* FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE g.workspace_id = ? AND gm.user_id = ?
    `).all(workspaceId, userId);
    res.json(groups);
  });

  app.post('/api/groups', async (req: AuthRequest, res) => {
    const { workspaceId, id: userId } = req.user!;
    const { name, description, memberIds } = req.body;
    const groupId = generateId('GRP');
    
    db.prepare('INSERT INTO groups (id, workspace_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(groupId, workspaceId, name, description || '', userId);
      
    await db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(groupId, userId, 'admin');
    
    if (Array.isArray(memberIds)) {
      const insertMember = db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)');
      for (const memberId of memberIds) {
        if (memberId !== userId) {
          await insertMember.run(groupId, memberId);
          
          const notifId = generateId('NOT');
          const sender = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
          db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
            .run(notifId, memberId, 'Added to Group', `${sender?.name || 'Someone'} added you to the group: ${name}`, 'info');
          io.to(`user_${memberId}`).emit('notification', { id: notifId, title: 'Added to Group', message: `${sender?.name || 'Someone'} added you to the group: ${name}` });
        }
      }
    }
    
    const group = await db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
    res.json({ success: true, group });
  });

  app.get('/api/groups/:id/members', async (req: AuthRequest, res) => {
    const { id } = req.params;
    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.role, gm.role as group_role 
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ?
    `).all(id);
    res.json(members);
  });

  app.get('/api/messages/:type/:id', async (req: AuthRequest, res) => {
    const { workspaceId, id: userId } = req.user!;
    const { type, id } = req.params;
    
    if (type === 'group') {
      const messages = await db.prepare('SELECT * FROM messages WHERE group_id = ? ORDER BY timestamp ASC').all(id);
      res.json(messages);
    } else {
      const messages = db.prepare(`
        SELECT * FROM messages 
        WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
        ORDER BY timestamp ASC
      `).all(userId, id, id, userId);
      res.json(messages);
    }
  });

  app.get('/api/drafts', authMiddleware, async (req: AuthRequest, res) => {
    const { id: userId, workspaceId } = req.user!;
    try {
      const drafts = db.prepare('SELECT * FROM draft_tasks WHERE created_by = ? AND workspace_id = ? AND status = ? ORDER BY created_at DESC').all(userId, workspaceId, 'pending_confirmation');
      res.json(drafts);
    } catch (error) {
      console.error('Failed to fetch drafts', error);
      res.status(500).json({ error: 'Failed to fetch drafts' });
    }
  });

  app.delete('/api/drafts/:id', authMiddleware, async (req: AuthRequest, res) => {
    const { id: userId } = req.user!;
    const { id } = req.params;
    try {
      db.prepare('UPDATE draft_tasks SET status = ? WHERE id = ? AND created_by = ?').run('cancelled', id, userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to cancel draft' });
    }
  });

  app.post('/api/drafts/:id/confirm', authMiddleware, async (req: AuthRequest, res) => {
    const { id: userId, workspaceId } = req.user!;
    const { id } = req.params;
    try {
      const draft = db.prepare('SELECT * FROM draft_tasks WHERE id = ? AND created_by = ? AND workspace_id = ? AND status = ?').get(id, userId, workspaceId, 'pending_confirmation') as any;
      if (!draft) {
        return res.status(404).json({ error: 'Draft not found or already processed' });
      }

      const taskId = generateId('TSK');
      
      db.prepare(`
        INSERT INTO tasks 
        (id, workspace_id, title, description, assigned_to_type, assigned_to_id, priority, status, due_date, due_time, created_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        taskId, draft.workspace_id, draft.title, draft.description, 
        draft.assigned_to_id ? 'user' : null, draft.assigned_to_id, 
        draft.priority, 'Todo', draft.due_date, draft.due_time, draft.created_by
      );
      
      db.prepare('UPDATE draft_tasks SET status = ? WHERE id = ?').run('confirmed', id);
      
      res.json({ success: true, taskId });
    } catch (error) {
      console.error('Failed to confirm draft', error);
      res.status(500).json({ error: 'Failed to confirm draft' });
    }
  });

  app.post('/api/chatbot', async (req: AuthRequest, res) => {
    const { message, attachment } = req.body;
    try {
      let contents: any = message;
      
      if (attachment) {
        // Extract filename from /uploads/filename
        const filename = attachment.split('/').pop();
        if (filename) {
          const filePath = path.join(process.cwd(), 'uploads', filename);
          if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath);
            const base64Data = fileData.toString('base64');
            const ext = path.extname(filename).toLowerCase();
            let mimeType = 'application/octet-stream';
            
            if (ext === '.png') mimeType = 'image/png';
            else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
            else if (ext === '.webp') mimeType = 'image/webp';
            else if (ext === '.pdf') mimeType = 'application/pdf';
            
            contents = {
              parts: [
                { text: message || "Analyze this file." },
                {
                  inlineData: {
                    data: base64Data,
                    mimeType
                  }
                }
              ]
            };
          }
        }
      }

      const createTaskDeclaration = {
        name: "createTask",
        description: "Create a new task in the task management system. Use this when the user asks to create a task, schedule something, or add a reminder.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            title: { type: "STRING" as any, description: "The title of the task." },
            description: { type: "STRING" as any, description: "Detailed description of the task." },
            priority: { type: "STRING" as any, description: "Priority of the task: 'High', 'Medium', or 'Low'." },
            dueDate: { type: "STRING" as any, description: "Due date in YYYY-MM-DD format." },
            recurring: { type: "STRING" as any, description: "Recurring rule: 'None', 'Daily', 'Weekly', or 'Monthly'." }
          },
          required: ["title"]
        }
      };

      const response = await getAiClient().models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          systemInstruction: "You are Routine AI, a helpful assistant. You can answer questions, scrape data from the web using Google Search, and create tasks for the user.",
          tools: [{ googleSearch: {} }, { functionDeclarations: [createTaskDeclaration as any] }],
          toolConfig: { includeServerSideToolInvocations: true } as any
        }
      });

      let reply = response.text;

      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name === 'createTask') {
            const args = call.args as any;
            const taskId = generateId('TSK');
            const stmt = db.prepare(`
              INSERT INTO tasks (
                id, workspace_id, title, description, priority, status, due_date, created_by, assigned_to_type, assigned_to_id, recurring_rule
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
      await stmt.run(
              taskId,
              req.user!.workspaceId,
              args.title,
              args.description || '',
              args.priority || 'Medium',
              'Todo',
              args.dueDate || null,
              req.user!.id,
              'user',
              req.user!.id,
              args.recurring || 'None'
            );
            reply = `I have created the task: "${args.title}".`;
          }
        }
      }

      res.json({ reply });
    } catch (error) {
      console.error('Chatbot error:', error);
      res.status(500).json({ reply: "I'm sorry, I encountered an error while processing your request." });
    }
  });

  // --- ROLES API ---
  app.get('/api/roles', async (req: AuthRequest, res) => {
    const { workspaceId } = req.user!;
    let roles = await db.prepare('SELECT * FROM roles WHERE workspace_id = ?').all(workspaceId);
    
    if (roles.length === 0) {
      // Seed default roles
      const defaultRoles = [
        { id: 'owner', name: 'Owner', description: 'Full access to all workspace settings and billing.', permissions: '["manage_workspace","update_workspace","manage_subscription","switch_workspace","delete_workspace","manage_members","manage_roles","manage_departments","manage_projects","view_projects","manage_tasks","create_tasks","approve_tasks","manage_chat","use_ai","view_reports","view_audit_logs"]', is_system: 1, color: 'bg-rose-100 text-rose-600 border-rose-200' },
        { id: 'admin', name: 'Admin', description: 'Can manage members, projects, and tasks.', permissions: '["manage_members","manage_roles","manage_projects","manage_tasks","create_tasks","approve_tasks","view_reports","view_projects","use_ai"]', is_system: 1, color: 'bg-amber-100 text-amber-600 border-amber-200' },
        { id: 'manager', name: 'Manager', description: 'Can manage projects and tasks within assigned departments.', permissions: '["manage_projects","manage_tasks","create_tasks","approve_tasks","view_reports","view_projects","use_ai"]', is_system: 1, color: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
        { id: 'member', name: 'Member', description: 'Standard team member with task creation access.', permissions: '["create_tasks","view_projects","use_ai"]', is_system: 1, color: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
        { id: 'guest', name: 'Guest', description: 'Read-only access to specific projects.', permissions: '["view_projects"]', is_system: 1, color: 'bg-slate-100 text-slate-600 border-slate-200' }
      ];
      
      for (const r of defaultRoles) {
        db.prepare('INSERT OR IGNORE INTO roles (id, workspace_id, name, description, permissions, is_system, color) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(r.id, workspaceId, r.name, r.description, r.permissions, r.is_system, r.color);
      }
      roles = await db.prepare('SELECT * FROM roles WHERE workspace_id = ?').all(workspaceId);
    }

    res.json(roles.map((r: any) => ({ 
      ...r, 
      permissions: JSON.parse(r.permissions || '[]'),
      isSystem: r.is_system === 1
    })));
  });

  app.post('/api/roles', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    const { id, name, description, departmentId, permissions, color, isSystem } = req.body;
    const roleId = id || generateId('ROL');
    db.prepare('INSERT INTO roles (id, workspace_id, department_id, name, description, permissions, color, is_system) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(roleId, workspaceId, departmentId || null, name, description || '', JSON.stringify(permissions || []), color || 'bg-slate-100 text-slate-600 border-slate-200', isSystem ? 1 : 0);
    res.json({ success: true, id: roleId });
  });

  app.patch('/api/roles/:id', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    const { name, description, departmentId, permissions, color } = req.body;
    
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    const updates: string[] = [];
    const params: any[] = [];
    if (name) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (departmentId !== undefined) { updates.push('department_id = ?'); params.push(departmentId); }
    if (permissions !== undefined) { updates.push('permissions = ?'); params.push(JSON.stringify(permissions)); }
    if (color) { updates.push('color = ?'); params.push(color); }
    
    if (updates.length > 0) {
      params.push(id);
      params.push(workspaceId);
      await db.prepare(`UPDATE roles SET ${updates.join(', ')} WHERE id = ? AND workspace_id = ?`).run(...params);
    }
    res.json({ success: true });
  });

  app.delete('/api/roles/:id', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    const existingRole = await db.prepare('SELECT is_system FROM roles WHERE id = ? AND workspace_id = ?').get(id, workspaceId) as any;
    if (existingRole?.is_system) return res.status(400).json({ error: 'Cannot delete system roles' });

    await db.prepare('DELETE FROM roles WHERE id = ? AND workspace_id = ?').run(id, workspaceId);
    res.json({ success: true });
  });

  // --- INVITATIONS API ---
  app.get('/api/invitations', async (req: AuthRequest, res) => {
    const { workspaceId } = req.user!;
    const invitations = await db.prepare('SELECT * FROM invitations WHERE workspace_id = ?').all(workspaceId);
    res.json(invitations);
  });

  app.post('/api/invitations', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    const { email, phone, role: inviteRole, roleId } = req.body;
    const id = generateId('INV');
    const code = Math.random().toString(36).substr(2, 8).toUpperCase();
    db.prepare('INSERT INTO invitations (id, workspace_id, email, phone, role, role_id, code) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, workspaceId, email || null, phone || null, inviteRole, roleId || null, code);
      
    const invitation = { id, workspace_id: workspaceId, email, phone, role: inviteRole, code, status: 'pending', created_at: new Date().toISOString() };
    io.emit('invitation_created', { id, workspaceId });
    res.json({ success: true, invitation });
  });

  app.delete('/api/invitations/:id', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    const { id } = req.params;
    if (!['Owner', 'Admin'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    await db.prepare('DELETE FROM invitations WHERE id = ? AND workspace_id = ?').run(id, workspaceId);
    io.emit('invitation_deleted', { id, workspaceId });
    res.json({ success: true });
  });

  // --- TASKS API ---
  app.get('/api/tasks', async (req: AuthRequest, res) => {
    const { id: userId, role, workspaceId, departmentId } = req.user!;
    const showDeactivated = req.query.showDeactivated === 'true';
    
    let query = 'SELECT * FROM tasks WHERE workspace_id = ?';
    let params: any[] = [workspaceId];
    
    if (role === 'Employee') {
      if (departmentId) {
        query += ' AND (assigned_to_id = ? OR created_by = ? OR (assigned_to_type = ? AND assigned_to_id = ?))';
        params.push(userId, userId, 'department', departmentId);
      } else {
        query += ' AND (assigned_to_id = ? OR created_by = ?)';
        params.push(userId, userId);
      }
    } else if (role === 'Manager' && departmentId) {
      // Manager sees their department's tasks, tasks assigned to them, or created by them
      const deptUsers = db.prepare('SELECT id FROM users WHERE department_id = ?').all(departmentId) as {id: string}[];
      const deptUserIds = deptUsers.map(u => u.id);
      const placeholders = deptUserIds.length > 0 ? deptUserIds.map(() => '?').join(',') : 'NULL';
      
      query += ` AND (assigned_to_id = ? OR created_by = ? OR (assigned_to_type = ? AND assigned_to_id = ?) OR (assigned_to_type = 'user' AND assigned_to_id IN (${placeholders})))`;
      params.push(userId, userId, 'department', departmentId, ...deptUserIds);
    }

    if (!showDeactivated) {
      query += ' AND is_deactivated = 0';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const tasks = await db.prepare(query).all(...params).map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      project: t.project_id,
      priority: t.priority,
      status: t.status,
      dueDate: t.due_date,
      dueTime: t.due_time,
      type: t.type,
      createdBy: t.created_by,
      assignees: t.assigned_to_id ? [t.assigned_to_id] : [],
      assignedToType: t.assigned_to_type,
      proofType: t.proof_type || 'None',
      photoUrl: t.photo_url,
      attachments: JSON.parse(t.attachments || '[]'),
      recurring: t.recurring_rule,
      timeSpent: t.time_spent,
      comments: JSON.parse(t.comments || '[]'),
      subtasks: JSON.parse(t.subtasks || '[]'),
      dependencies: JSON.parse(t.dependencies || '[]'),
      relatedTasks: JSON.parse(t.related_tasks || '[]'),
      requiresApproval: t.requires_approval === 1,
      isDeactivated: t.is_deactivated === 1,
      geofence: t.geofence_lat ? {
        lat: t.geofence_lat,
        lng: t.geofence_lng,
        radius: t.geofence_radius,
        enforcement: t.geofence_enforcement || 'both'
      } : null
    }));
    res.json(tasks);
  });

  app.post('/api/tasks', async (req: AuthRequest, res) => {
    const { id: userId, role, workspaceId } = req.user!;
    const { id: reqId, title, description, project, priority, status, dueDate, dueTime, type, assignees, assignedToType, proofType, photoUrl, attachments, recurring, timeSpent, comments, subtasks, dependencies, relatedTasks, requiresApproval, geofence } = req.body;
    const id = reqId || generateId('TSK');
    
    let assignedToId = assignees && assignees.length > 0 ? assignees[0] : null;
    let finalAssignedToType = assignedToType || 'user';

    if (role === 'Employee' && type !== 'issue') {
      assignedToId = userId;
    }

    const stmt = db.prepare(`
      INSERT INTO tasks (
        id, workspace_id, title, description, project_id, priority, status, due_date, due_time, type, created_by, assigned_to_type, assigned_to_id, 
        proof_type, photo_url, attachments, recurring_rule, time_spent, comments, subtasks, dependencies, related_tasks, requires_approval,
        geofence_lat, geofence_lng, geofence_radius, geofence_enforcement
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
      await stmt.run(
      id, workspaceId, title, description || null, project, priority, status, dueDate || null, dueTime || null, type || 'task', userId, finalAssignedToType, assignedToId,
      proofType || 'None', photoUrl || null, JSON.stringify(attachments || []), recurring || null, timeSpent || 0, 
      JSON.stringify(comments || []), JSON.stringify(subtasks || []), JSON.stringify(dependencies || []), JSON.stringify(relatedTasks || []), requiresApproval ? 1 : 0,
      geofence?.lat || null, geofence?.lng || null, geofence?.radius || null, geofence?.enforcement || null
    );
    
    const newTask = { ...req.body, createdBy: userId, assignees: assignedToId ? [assignedToId] : [], assignedToType: finalAssignedToType };
    io.emit('task_created', newTask);
    await logActivity(workspaceId, userId, 'create_task', { taskId: id, title });
    
    // Send chat message and notification to assignee
    if (assignedToId && assignedToId !== userId) {
      if (finalAssignedToType === 'user') {
        const msgId = generateId('MSG');
        const msgText = `I have assigned a new task to you: **${title}**.\n\n${description || ''}`;
        db.prepare('INSERT INTO messages (id, workspace_id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?, ?)')
          .run(msgId, workspaceId, userId, assignedToId, msgText);
        
        const savedMsg = { id: msgId, workspace_id: workspaceId, sender_id: userId, receiver_id: assignedToId, message: msgText, timestamp: new Date().toISOString() };
        io.to(`user_${assignedToId}`).to(`user_${userId}`).emit('chat_message', savedMsg);

        const notifId = generateId('NOT');
        const sender = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
        db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
          .run(notifId, assignedToId, 'New Task Assigned', `${sender?.name || 'Someone'} assigned you a new task: ${title}`, 'info');
        io.to(`user_${assignedToId}`).emit('notification', { id: notifId, title: 'New Task Assigned', message: `${sender?.name || 'Someone'} assigned you a new task: ${title}` });
      } else if (finalAssignedToType === 'department') {
        const deptUsers = db.prepare('SELECT id FROM users WHERE department_id = ?').all(assignedToId) as {id: string}[];
        const sender = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
        const dept = await db.prepare('SELECT name FROM departments WHERE id = ?').get(assignedToId) as any;
        
        for (const u of deptUsers) {
          if (u.id !== userId) {
            const notifId = generateId('NOT');
            db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
              .run(notifId, u.id, 'New Department Task', `${sender?.name || 'Someone'} assigned a task to ${dept?.name || 'your department'}: ${title}`, 'info');
            io.to(`user_${u.id}`).emit('notification', { id: notifId, title: 'New Department Task', message: `${sender?.name || 'Someone'} assigned a task to ${dept?.name || 'your department'}: ${title}` });
          }
        }
      } else if (finalAssignedToType === 'role') {
        const roleUsers = db.prepare('SELECT id FROM users WHERE role_id = ?').all(assignedToId) as {id: string}[];
        const sender = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
        const roleObj = await db.prepare('SELECT name FROM roles WHERE id = ?').get(assignedToId) as any;
        
        for (const u of roleUsers) {
          if (u.id !== userId) {
            const notifId = generateId('NOT');
            db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
              .run(notifId, u.id, 'New Role Task', `${sender?.name || 'Someone'} assigned a task to ${roleObj?.name || 'your role'}: ${title}`, 'info');
            io.to(`user_${u.id}`).emit('notification', { id: notifId, title: 'New Role Task', message: `${sender?.name || 'Someone'} assigned a task to ${roleObj?.name || 'your role'}: ${title}` });
          }
        }
      }
    }
    
    res.json({ success: true, task: newTask });
  });

  app.patch('/api/tasks/:id', async (req: AuthRequest, res) => {
    const { id: userId, role, workspaceId } = req.user!;
    const { id } = req.params;
    const updates = req.body;
    
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isCreator = task.created_by === userId;
    const isAssignee = task.assigned_to_id === userId;

    if (role === 'Employee') {
      if (task.type === 'issue' && isCreator && !isAssignee) return res.status(403).json({ error: 'Employees cannot update reported issues' });
      if (!isCreator && !isAssignee) return res.status(403).json({ error: 'Forbidden' });
      if (!isCreator && isAssignee) {
        const allowedUpdates = ['status', 'photoUrl', 'attachments', 'timeSpent', 'comments', 'subtasks'];
        if (!Object.keys(updates).every(k => allowedUpdates.includes(k))) return res.status(403).json({ error: 'Assignees can only update task progress' });
      }
    } else if (!['Owner', 'Admin', 'Manager'].includes(role) && !isCreator) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.project !== undefined) dbUpdates.project_id = updates.project;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.dueTime !== undefined) dbUpdates.due_time = updates.dueTime;
    if (updates.assignedToType !== undefined) dbUpdates.assigned_to_type = updates.assignedToType;
    if (updates.assignees !== undefined) dbUpdates.assigned_to_id = updates.assignees.length > 0 ? updates.assignees[0] : null;
    if (updates.proofType !== undefined) dbUpdates.proof_type = updates.proofType;
    if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
    if (updates.attachments !== undefined) dbUpdates.attachments = JSON.stringify(updates.attachments);
    if (updates.comments !== undefined) dbUpdates.comments = JSON.stringify(updates.comments);
    if (updates.subtasks !== undefined) dbUpdates.subtasks = JSON.stringify(updates.subtasks);
    if (updates.dependencies !== undefined) dbUpdates.dependencies = JSON.stringify(updates.dependencies);
    if (updates.relatedTasks !== undefined) dbUpdates.related_tasks = JSON.stringify(updates.relatedTasks);
    if (updates.timeSpent !== undefined) dbUpdates.time_spent = updates.timeSpent;
    if (updates.requiresApproval !== undefined) dbUpdates.requires_approval = updates.requiresApproval ? 1 : 0;
    if (updates.geofence !== undefined) {
      dbUpdates.geofence_lat = updates.geofence?.lat || null;
      dbUpdates.geofence_lng = updates.geofence?.lng || null;
      dbUpdates.geofence_radius = updates.geofence?.radius || null;
      dbUpdates.geofence_enforcement = updates.geofence?.enforcement || null;
    }

    const setClause = Object.keys(dbUpdates).map(k => `${k} = ?`).join(', ');
    const params = [...Object.values(dbUpdates), id];
    
    if (setClause) {
      await db.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`).run(...params);
      io.emit('task_updated', { id, updates });
      await logActivity(workspaceId, userId, 'update_task', { taskId: id, updates });
      
      // Notify creator if assignee updates it
      if (task.created_by !== userId && updates.status) {
        const notifId = generateId('NOT');
        const sender = await db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
        db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
          .run(notifId, task.created_by, 'Task Updated', `${sender?.name || 'Someone'} updated task status to ${updates.status}: ${task.title}`, 'info');
        io.to(`user_${task.created_by}`).emit('notification', { id: notifId, title: 'Task Updated', message: `${sender?.name || 'Someone'} updated task status to ${updates.status}: ${task.title}` });
      }
    }
    res.json({ success: true });
  });

  app.delete('/api/tasks/:id', async (req: AuthRequest, res) => {
    const { id: userId, role } = req.user!;
    const { id } = req.params;
    
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (role !== 'Owner' && role !== 'Admin' && task.created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    await db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    io.emit('task_deleted', { id });
    res.json({ success: true });
  });

  app.post('/api/tasks/:id/deactivate', async (req: AuthRequest, res) => {
    const { id: userId, role, workspaceId } = req.user!;
    const { id } = req.params;
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!['Owner', 'Admin', 'Manager'].includes(role) && task.created_by !== userId) return res.status(403).json({ error: 'Forbidden' });
    
    await db.prepare('UPDATE tasks SET is_deactivated = 1 WHERE id = ?').run(id);
    io.emit('task_updated', { id, updates: { isDeactivated: true } });
    res.json({ success: true });
  });

  app.post('/api/tasks/:id/activate', async (req: AuthRequest, res) => {
    const { id: userId, role, workspaceId } = req.user!;
    const { id } = req.params;
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!['Owner', 'Admin', 'Manager'].includes(role) && task.created_by !== userId) return res.status(403).json({ error: 'Forbidden' });
    
    await db.prepare('UPDATE tasks SET is_deactivated = 0 WHERE id = ?').run(id);
    io.emit('task_updated', { id, updates: { isDeactivated: false } });
    res.json({ success: true });
  });

  // --- ACTIVITY LOGS API ---
  app.get('/api/activity-logs', async (req: AuthRequest, res) => {
    const { workspaceId, role } = req.user!;
    if (!['Owner', 'Admin', 'Manager'].includes(role)) return res.status(403).json({ error: 'Forbidden' });
    
    const logs = db.prepare(`
      SELECT a.*, u.name as user_name 
      FROM activity_logs a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE a.workspace_id = ? 
      ORDER BY a.created_at DESC 
      LIMIT 100
    `).all(workspaceId);
    res.json(logs);
  });

  async function logActivity(workspaceId: string, userId: string, action: string, details: any) {
    try {
      const id = generateId('ACT');
      db.prepare('INSERT INTO activity_logs (id, workspace_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)')
        .run(id, workspaceId, userId, action, JSON.stringify(details));
    } catch (e) {
      console.error('Failed to log activity', e);
    }
  }

  // --- TIME LOGS API ---
  app.get('/api/time-logs/active', async (req: AuthRequest, res) => {
    const { id: userId } = req.user!;
    const activeTimer = await db.prepare('SELECT * FROM time_logs WHERE user_id = ? AND end_time IS NULL').get(userId);
    if (!activeTimer) return res.status(404).json({ error: 'No active timer' });
    res.json(activeTimer);
  });

  app.get('/api/time-logs/:taskId', async (req: AuthRequest, res) => {
    const { taskId } = req.params;
    const logs = await db.prepare('SELECT * FROM time_logs WHERE task_id = ? ORDER BY created_at DESC').all(taskId);
    res.json(logs);
  });

  app.post('/api/time-logs/start', async (req: AuthRequest, res) => {
    const { id: userId } = req.user!;
    const { taskId } = req.body;
    
    // Check if there's already an active timer
    const activeTimer = await db.prepare('SELECT * FROM time_logs WHERE user_id = ? AND end_time IS NULL').get(userId);
    if (activeTimer) {
      return res.status(400).json({ error: 'A timer is already running' });
    }
    
    const id = generateId('TIM');
    const startTime = new Date().toISOString();
    
    db.prepare('INSERT INTO time_logs (id, task_id, user_id, start_time) VALUES (?, ?, ?, ?)')
      .run(id, taskId, userId, startTime);
      
    res.json({ success: true, id, startTime });
  });

  app.post('/api/time-logs/stop', async (req: AuthRequest, res) => {
    const { id: userId } = req.user!;
    
    const log = await db.prepare('SELECT * FROM time_logs WHERE user_id = ? AND end_time IS NULL').get(userId) as any;
    if (!log) return res.status(400).json({ error: 'No active timer' });
    
    const endTime = new Date();
    const startTime = new Date(log.start_time);
    const durationMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000); // in minutes
    
    db.prepare('UPDATE time_logs SET end_time = ?, duration = ? WHERE id = ?')
      .run(endTime.toISOString(), durationMinutes, log.id);
      
    // Update total time spent on task
    await db.prepare('UPDATE tasks SET time_spent = COALESCE(time_spent, 0) + ? WHERE id = ?').run(durationMinutes, log.task_id);
    
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(log.task_id) as any;
    io.emit('task_updated', { id: log.task_id, updates: { timeSpent: task.time_spent } });
      
    res.json({ success: true, duration: durationMinutes });
  });

  // --- NOTIFICATIONS API ---
  app.get('/api/notifications', authMiddleware, async (req: AuthRequest, res) => {
    const { id: userId } = req.user!;
    const notifications = await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(userId);
    res.json(notifications);
  });

  app.patch('/api/notifications/:id/read', authMiddleware, async (req: AuthRequest, res) => {
    const { id: userId } = req.user!;
    const { id } = req.params;
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    res.json({ success: true });
  });

  app.patch('/api/notifications/read-all', authMiddleware, async (req: AuthRequest, res) => {
    const { id: userId } = req.user!;
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
    res.json({ success: true });
  });

  app.delete('/api/notifications', authMiddleware, async (req: AuthRequest, res) => {
    const { id: userId } = req.user!;
    await db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
    res.json({ success: true });
  });

  // --- VASY INTEGRATION ---
  app.get('/api/vasy/api/v1/employees', async (req: AuthRequest, res) => {
    res.json([
      { id: 'v1', firstName: 'Sarah', lastName: 'Connor', email: 'sarah@vasyerp.com', designation: 'Project Manager' },
      { id: 'v2', firstName: 'John', lastName: 'Doe', email: 'john@vasyerp.com', designation: 'Frontend Developer' }
    ]);
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', async (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
