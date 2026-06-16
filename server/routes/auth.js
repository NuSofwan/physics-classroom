import { Router } from 'express';
import { createSession, destroySession } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Admin logout - invalidate the current session token
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    destroySession(authHeader.split(' ')[1]);
  }
  res.json({ message: 'ออกจากระบบแล้ว' });
});

// Admin login
router.post('/admin-login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'physics2026';

  if (password !== adminPassword) {
    return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
  }

  const token = createSession();
  res.json({ token, message: 'เข้าสู่ระบบสำเร็จ' });
});

// Student join classroom by code
router.post('/join-classroom', (req, res) => {
  const { code } = req.body;

  if (!code || code.trim().length < 4) {
    return res.status(400).json({ error: 'กรุณากรอกรหัสกลุ่ม' });
  }

  const classroom = db.getClassroomByCode(code.trim().toUpperCase());

  if (!classroom) {
    return res.status(404).json({ error: 'ไม่พบกลุ่มที่ตรงกับรหัสนี้' });
  }

  const { id, name, description, code: classCode, cover_color } = classroom;
  res.json({ classroom: { id, name, description, code: classCode, cover_color } });
});

export default router;
