// Simple admin authentication middleware.
// Sessions are persisted to disk so a server restart (e.g. after a deploy)
// does not silently log the admin out.

import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days
const sessionFile = path.join(__dirname, '..', '..', 'data', 'sessions.json');

function loadSessions() {
  try {
    if (fs.existsSync(sessionFile)) {
      return JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    }
  } catch {
    /* ignore corrupt session file */
  }
  return {};
}

function saveSessions(sessions) {
  try {
    fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
    fs.writeFileSync(sessionFile, JSON.stringify(sessions), 'utf-8');
  } catch (err) {
    console.error('Could not persist sessions:', err.message);
  }
}

// token -> createdAt (ms)
let activeSessions = loadSessions();

function pruneExpired() {
  const now = Date.now();
  let changed = false;
  for (const [token, createdAt] of Object.entries(activeSessions)) {
    if (now - createdAt > SESSION_TTL) {
      delete activeSessions[token];
      changed = true;
    }
  }
  if (changed) saveSessions(activeSessions);
}

export function createSession() {
  pruneExpired();
  const token = randomUUID();
  activeSessions[token] = Date.now();
  saveSessions(activeSessions);
  return token;
}

export function destroySession(token) {
  if (activeSessions[token]) {
    delete activeSessions[token];
    saveSessions(activeSessions);
  }
}

export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
  }

  const token = authHeader.split(' ')[1];
  const createdAt = activeSessions[token];

  if (!createdAt || Date.now() - createdAt > SESSION_TTL) {
    if (createdAt) destroySession(token);
    return res.status(401).json({ error: 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }

  next();
}

export function validateClassroomCode(req, res, next) {
  const code = req.params.code || req.body.code;
  if (!code || code.length < 4) {
    return res.status(400).json({ error: 'รหัสกลุ่มไม่ถูกต้อง' });
  }
  next();
}
