import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Generate a readable classroom code
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get all classrooms (admin only)
router.get('/', requireAdmin, async (req, res) => {
  const classrooms = await db.getAllClassrooms();
  res.json({ classrooms });
});

// Create a new classroom (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { name, description, cover_color } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อกลุ่ม' });
  }

  let code;
  let attempts = 0;
  do {
    code = generateCode();
    attempts++;
  } while ((await db.getClassroomByCode(code)) && attempts < 10);

  const classroom = {
    id: uuidv4(),
    name: name.trim(),
    code,
    description: description || '',
    cover_color: cover_color || '#6366f1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db.createClassroom(classroom);
  res.status(201).json({ classroom });
});

// Update a classroom (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, cover_color } = req.body;

  const existing = await db.getClassroomById(id);
  if (!existing) {
    return res.status(404).json({ error: 'ไม่พบกลุ่มนี้' });
  }

  const updated = await db.updateClassroom(id, {
    name: name || existing.name,
    description: description !== undefined ? description : existing.description,
    cover_color: cover_color || existing.cover_color,
  });

  res.json({ classroom: updated });
});

// Delete a classroom (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const existing = await db.getClassroomById(id);
  if (!existing) {
    return res.status(404).json({ error: 'ไม่พบกลุ่มนี้' });
  }

  await db.deleteClassroom(id);
  res.json({ message: 'ลบกลุ่มเรียบร้อยแล้ว' });
});

// Get classroom by code (public - for students)
router.get('/code/:code', async (req, res) => {
  const { code } = req.params;
  const classroom = await db.getClassroomByCode(code.toUpperCase());

  if (!classroom) {
    return res.status(404).json({ error: 'ไม่พบกลุ่มที่ตรงกับรหัสนี้' });
  }

  const videos = (await db.getVideosByClassroom(classroom.id)).map(v => ({
    id: v.id,
    title: v.title,
    description: v.description,
    duration: v.duration,
    order_index: v.order_index,
    created_at: v.created_at,
  }));

  const { id, name, description, code: classCode, cover_color } = classroom;
  res.json({ classroom: { id, name, description, code: classCode, cover_color }, videos });
});

export default router;
