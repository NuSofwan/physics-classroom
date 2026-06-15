// Simple admin authentication middleware
// Uses a session token stored in memory (resets on server restart)

const activeSessions = new Map();

export function createSession() {
  const token = crypto.randomUUID();
  activeSessions.set(token, { createdAt: Date.now() });
  return token;
}

export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
  }

  const token = authHeader.split(' ')[1];
  if (!activeSessions.has(token)) {
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
