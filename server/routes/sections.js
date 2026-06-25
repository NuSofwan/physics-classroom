import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAdmin } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// GET /api/sections/classroom/:classroomId — list sections (admin)
router.get('/classroom/:classroomId', requireAdmin, async (req, res) => {
  const { classroomId } = req.params;
  const classroom = await db.getClassroomById(classroomId);
  if (!classroom) return res.status(404).json({ error: 'ไม่พบกลุ่มนี้' });

  const sections = await db.getSectionsByClassroom(classroomId);
  res.json({ sections });
});

// POST /api/sections/classroom/:classroomId — create section (admin)
router.post('/classroom/:classroomId', requireAdmin, async (req, res) => {
  const { classroomId } = req.params;
  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'กรุณาระบุชื่อหมวด' });
  }

  const classroom = await db.getClassroomById(classroomId);
  if (!classroom) return res.status(404).json({ error: 'ไม่พบกลุ่มนี้' });

  const orderIndex = (await db.getMaxSectionOrder(classroomId)) + 1;
  const now = new Date().toISOString();

  const section = {
    id: uuidv4(),
    classroom_id: classroomId,
    name: name.trim(),
    order_index: orderIndex,
    sort_mode: 'date',
    created_at: now,
    updated_at: now,
  };

  await db.createSection(section);
  res.status(201).json({ section });
});

// PUT /api/sections/:id — update name/sort_mode (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, sort_mode } = req.body;

  const existing = await db.getSectionById(id);
  if (!existing) return res.status(404).json({ error: 'ไม่พบหมวดนี้' });

  if (sort_mode !== undefined && !['date', 'manual'].includes(sort_mode)) {
    return res.status(400).json({ error: 'sort_mode ต้องเป็น date หรือ manual' });
  }

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (sort_mode !== undefined) updates.sort_mode = sort_mode;

  const updated = await db.updateSection(id, updates);
  res.json({ section: updated });
});

// DELETE /api/sections/:id — delete section (videos become null) (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const existing = await db.getSectionById(id);
  if (!existing) return res.status(404).json({ error: 'ไม่พบหมวดนี้' });

  await db.deleteSection(id);
  res.json({ message: 'ลบหมวดเรียบร้อยแล้ว' });
});

// PUT /api/sections/classroom/:classroomId/reorder — reorder sections (admin)
router.put('/classroom/:classroomId/reorder', requireAdmin, async (req, res) => {
  const { classroomId } = req.params;
  const { order } = req.body;

  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'รูปแบบลำดับไม่ถูกต้อง' });
  }

  const classroom = await db.getClassroomById(classroomId);
  if (!classroom) return res.status(404).json({ error: 'ไม่พบกลุ่มนี้' });

  for (let idx = 0; idx < order.length; idx++) {
    const s = await db.getSectionById(order[idx]);
    if (s && s.classroom_id === classroomId) {
      await db.updateSection(order[idx], { order_index: idx + 1 });
    }
  }

  const sections = await db.getSectionsByClassroom(classroomId);
  res.json({ sections });
});

export default router;
