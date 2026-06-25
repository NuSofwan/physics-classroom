import { api, showToast, copyToClipboard, logout, navigateTo as nav, groupVideosBySection } from '../utils.js';

export function renderAdminClassroom() {
  return `
    <nav class="navbar">
      <div class="navbar-inner">
        <a href="#/" class="navbar-brand">
          <span class="logo-icon">⚛️</span>
          <span class="brand-text">PhysicsClassroom</span>
        </a>
        <div class="navbar-actions">
          <button class="btn btn-ghost btn-sm" id="btn-logout">ออกจากระบบ</button>
        </div>
      </div>
    </nav>

    <div class="page">
      <div class="container">
        <a href="#/admin/dashboard" class="back-link">← กลับไปหน้าจัดการ</a>

        <div id="classroom-detail-container">
          <div class="loading-page">
            <div class="spinner"></div>
            <div class="loading-text">กำลังโหลด...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add / Edit Video Modal -->
    <div class="modal-overlay" id="add-video-modal">
      <div class="modal">
        <h2 class="modal-title" id="video-modal-title">🎬 เพิ่มวีดีโอ</h2>
        <p class="modal-subtitle">คัดลอก File ID จาก Google Drive URL มาวาง</p>

        <div class="form-group">
          <label class="form-label">ชื่อวีดีโอ *</label>
          <input type="text" class="form-input" id="video-title"
            placeholder="เช่น บทที่ 1 - กลศาสตร์"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Google Drive File ID *</label>
          <input type="text" class="form-input" id="video-file-id"
            placeholder="เช่น 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
            style="font-family: monospace; font-size: 0.85rem;"
          />
          <span class="form-hint">
            วางลิงก์เต็มก็ได้ เช่น https://drive.google.com/file/d/<b>FILE_ID</b>/view — ระบบจะดึง FILE_ID ให้อัตโนมัติ
          </span>
        </div>

        <div class="form-group">
          <label class="form-label">ความยาว (ไม่จำเป็น)</label>
          <input type="text" class="form-input" id="video-duration"
            placeholder="เช่น 15:30"
          />
        </div>

        <div class="form-group">
          <label class="form-label">คำอธิบาย</label>
          <textarea class="form-textarea" id="video-description"
            placeholder="รายละเอียดเนื้อหาในวีดีโอ (ไม่จำเป็น)"
          ></textarea>
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="btn btn-primary" id="btn-add-video" style="flex:1">เพิ่มวีดีโอ</button>
          <button class="btn btn-secondary" id="btn-cancel-video">ยกเลิก</button>
        </div>
        <input type="hidden" id="edit-video-id" value="" />
      </div>
    </div>
  `;
}

export async function initAdminClassroom(navigateTo, classroomId) {
  document.getElementById('btn-logout').addEventListener('click', logout);

  const modal = document.getElementById('add-video-modal');

  document.getElementById('btn-cancel-video').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  // Auto-extract file ID from full Google Drive URL
  document.getElementById('video-file-id').addEventListener('paste', (e) => {
    setTimeout(() => {
      const { id } = extractFileId(e.target.value);
      if (id && id !== e.target.value.trim()) {
        e.target.value = id;
        showToast('File ID ถูกคัดลอกจาก URL อัตโนมัติ', 'info');
      }
    }, 50);
  });

  // Add / edit video submit — registered ONCE here. It must NOT live inside
  // loadClassroomDetail(), which re-runs after every add/edit/delete/reorder:
  // the submit button lives in the static modal (never re-rendered), so a
  // listener added there each reload would stack up and fire one click as
  // many POSTs — that is what created the 9 duplicate videos.
  const submitBtn = document.getElementById('btn-add-video');
  submitBtn.addEventListener('click', async () => {
    const titleInput = document.getElementById('video-title');
    const fileIdInput = document.getElementById('video-file-id');
    const durationInput = document.getElementById('video-duration');
    const descInput = document.getElementById('video-description');
    const editIdInput = document.getElementById('edit-video-id');

    const title = titleInput.value.trim();
    const duration = durationInput.value.trim();
    const description = descInput.value.trim();
    const editId = editIdInput.value;

    if (!title) {
      showToast('กรุณาระบุชื่อวีดีโอ', 'error');
      return;
    }

    const { id: fileId, error } = extractFileId(fileIdInput.value);
    if (error) {
      showToast(error, 'error');
      return;
    }

    submitBtn.disabled = true;
    try {
      if (editId) {
        await api(`/videos/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ title, google_drive_file_id: fileId, duration, description }),
        });
        showToast('บันทึกการแก้ไขแล้ว', 'success');
      } else {
        await api(`/videos/classroom/${classroomId}`, {
          method: 'POST',
          body: JSON.stringify({ title, google_drive_file_id: fileId, duration, description }),
        });
        showToast('เพิ่มวีดีโอสำเร็จ!', 'success');
      }

      modal.classList.remove('active');
      editIdInput.value = '';
      titleInput.value = '';
      fileIdInput.value = '';
      durationInput.value = '';
      descInput.value = '';
      await loadClassroomDetail(classroomId, navigateTo, modal);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  await loadClassroomDetail(classroomId, navigateTo, modal);
}

// Pull a Google Drive *file* ID out of whatever the user pasted. Rejects
// folder links (which are not playable) and obviously-invalid input.
function extractFileId(input) {
  const s = (input || '').trim();
  if (!s) return { error: 'กรุณาวางลิงก์หรือ File ID ของวีดีโอ' };
  if (/\/folders\//.test(s)) {
    return { error: 'นี่เป็นลิงก์โฟลเดอร์ ไม่ใช่ไฟล์วีดีโอ — เปิดไฟล์วีดีโอแล้วคัดลอกลิงก์ของไฟล์ (แบบ /file/d/.../view)' };
  }
  const m = s.match(/\/d\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return { id: m[1] };
  if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return { id: s }; // already a bare ID
  return { error: 'ลิงก์หรือ File ID ไม่ถูกต้อง' };
}

async function loadClassroomDetail(classroomId, navigateTo, modal) {
  try {
    const { classroom, videos, sections } = await api(`/videos/classroom/${classroomId}`);

    const container = document.getElementById('classroom-detail-container');

    // Build section options for move dropdown
    const sectionOptions = [
      `<option value="">ยังไม่จัดหมวด (เอาออกจากหมวด)</option>`,
      ...sections.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`),
      `<option value="__new__">➕ สร้างหมวดใหม่…</option>`,
    ].join('');

    // Build grouped video list HTML
    const groups = groupVideosBySection(videos, sections);

    const renderVideoRow = (v, groupVideos, isManual) => {
      const idx = groupVideos.indexOf(v);
      return `
        <div class="admin-video-item" data-id="${v.id}" data-section="${v.section_id || ''}">
          <input type="checkbox" class="video-select" data-id="${v.id}" style="margin-right:8px; cursor:pointer;">
          <div class="video-number">${idx + 1}</div>
          ${isManual ? `
          <div class="reorder-controls">
            <button class="reorder-btn move-up-btn" data-id="${v.id}" data-section="${v.section_id || ''}" title="เลื่อนขึ้น" ${idx === 0 ? 'disabled' : ''}>▲</button>
            <button class="reorder-btn move-down-btn" data-id="${v.id}" data-section="${v.section_id || ''}" title="เลื่อนลง" ${idx === groupVideos.length - 1 ? 'disabled' : ''}>▼</button>
          </div>` : ''}
          <div style="flex:1; min-width:0;">
            <div class="video-title">${escapeHtml(v.title)}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top:4px; word-break:break-all;">
              ${v.duration ? `⏱ ${escapeHtml(v.duration)} · ` : ''}ID: ${escapeHtml(v.google_drive_file_id.substring(0, 16))}…
              ${v.description ? ` · ${escapeHtml(v.description.substring(0, 50))}` : ''}
            </div>
          </div>
          <div class="video-actions">
            <button class="btn btn-ghost btn-sm preview-video-btn" data-id="${v.id}" data-code="${classroom.code}" title="ดูตัวอย่าง">▶️</button>
            <button class="btn btn-ghost btn-sm edit-video-btn" data-id="${v.id}" title="แก้ไข">✏️</button>
            <button class="btn btn-danger btn-sm delete-video-btn" data-id="${v.id}" data-title="${escapeHtml(v.title)}" title="ลบ">🗑️</button>
          </div>
        </div>
      `;
    };

    const renderGroup = (group, groupIdx) => {
      const { section, videos: gVids } = group;
      const isManual = section?.sort_mode === 'manual';
      const isUngrouped = section === null;

      const headerHtml = isUngrouped
        ? `<div class="section-header ungrouped-header">
             <span class="section-header-title">📂 ยังไม่จัดหมวด (${gVids.length})</span>
           </div>`
        : `<div class="section-header" data-section-id="${section.id}">
             <span class="section-header-title">📁 ${escapeHtml(section.name)} (${gVids.length})</span>
             <div class="section-header-actions">
               <button class="btn btn-ghost btn-sm sort-toggle-btn" data-id="${section.id}" data-mode="${section.sort_mode}" title="สลับโหมดเรียง">
                 ${isManual ? '🔢 ลากเรียงเอง' : '📅 เรียงตามวันที่'}
               </button>
               <button class="btn btn-ghost btn-sm rename-section-btn" data-id="${section.id}" data-name="${escapeHtml(section.name)}" title="แก้ชื่อ">✏️</button>
               <button class="btn btn-ghost btn-sm move-section-up-btn" data-id="${section.id}" title="เลื่อนหมวดขึ้น" ${groupIdx === 0 ? 'disabled' : ''}>⬆</button>
               <button class="btn btn-ghost btn-sm move-section-down-btn" data-id="${section.id}" title="เลื่อนหมวดลง" ${groupIdx === sections.length - 1 ? 'disabled' : ''}>⬇</button>
               <button class="btn btn-danger btn-sm delete-section-btn" data-id="${section.id}" data-name="${escapeHtml(section.name)}" title="ลบหมวด">🗑️</button>
             </div>
           </div>`;

      return `
        <div class="section-group" data-section-id="${section?.id || 'null'}">
          ${headerHtml}
          <div class="section-video-list">
            ${gVids.length === 0
              ? `<div style="padding: 12px 16px; color: var(--text-muted); font-size: 0.85rem;">ยังไม่มีวีดีโอในหมวดนี้</div>`
              : gVids.map(v => renderVideoRow(v, gVids, isManual)).join('')}
          </div>
        </div>
      `;
    };

    container.innerHTML = `
      <div class="dashboard-header">
        <div>
          <h1 class="dashboard-title" style="display:flex; align-items:center; gap:12px;">
            <span style="width:12px; height:12px; border-radius:50%; background:${classroom.cover_color}; display:inline-block;"></span>
            ${escapeHtml(classroom.name)}
          </h1>
          <p style="color: var(--text-secondary); margin-top: 4px;">${escapeHtml(classroom.description || '')}</p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-secondary btn-sm" id="btn-copy-code">🔑 รหัส: ${classroom.code}</button>
          <button class="btn btn-secondary btn-sm" id="btn-copy-link-detail">🔗 คัดลอกลิงก์</button>
          <button class="btn btn-secondary btn-sm" id="btn-add-section">📂 เพิ่มหมวด</button>
          <button class="btn btn-primary btn-sm" id="btn-show-add-video">➕ เพิ่มวีดีโอ</button>
        </div>
      </div>

      <!-- bulk-move action bar (hidden until ≥1 checkbox ticked) -->
      <div id="bulk-action-bar" class="bulk-action-bar" style="display:none;">
        <span id="bulk-count-label">เลือก 0 รายการ</span>
        <select id="bulk-section-select" class="form-input" style="width:auto; padding: 4px 8px;">${sectionOptions}</select>
        <button class="btn btn-primary btn-sm" id="btn-bulk-move">ย้าย</button>
        <button class="btn btn-ghost btn-sm" id="btn-bulk-cancel">ยกเลิก</button>
      </div>

      <div id="video-list-container">
        ${videos.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🎬</div>
            <div class="empty-text">ยังไม่มีวีดีโอในกลุ่มนี้</div>
            <button class="btn btn-primary" id="btn-first-video">➕ เพิ่มวีดีโอแรก</button>
          </div>
        ` : groups.map((g, i) => renderGroup(g, i)).join('')}
      </div>
    `;

    // Copy code / link
    document.getElementById('btn-copy-code').addEventListener('click', () => copyToClipboard(classroom.code));
    document.getElementById('btn-copy-link-detail').addEventListener('click', () => {
      const link = `${window.location.origin}${window.location.pathname}#/join/${classroom.code}`;
      copyToClipboard(link);
    });

    const titleInput = document.getElementById('video-title');
    const fileIdInput = document.getElementById('video-file-id');
    const durationInput = document.getElementById('video-duration');
    const descInput = document.getElementById('video-description');
    const editIdInput = document.getElementById('edit-video-id');

    const showAddModal = () => {
      editIdInput.value = '';
      titleInput.value = '';
      fileIdInput.value = '';
      durationInput.value = '';
      descInput.value = '';
      document.getElementById('video-modal-title').textContent = '🎬 เพิ่มวีดีโอ';
      document.getElementById('btn-add-video').textContent = 'เพิ่มวีดีโอ';
      fileIdInput.removeAttribute('disabled');
      modal.classList.add('active');
      setTimeout(() => titleInput.focus(), 100);
    };

    document.getElementById('btn-show-add-video').addEventListener('click', showAddModal);
    const firstVideoBtn = document.getElementById('btn-first-video');
    if (firstVideoBtn) firstVideoBtn.addEventListener('click', showAddModal);

    // Add section
    document.getElementById('btn-add-section').addEventListener('click', async () => {
      const name = prompt('ชื่อหมวดใหม่:');
      if (!name || !name.trim()) return;
      try {
        await api(`/sections/classroom/${classroomId}`, {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
        showToast('เพิ่มหมวดสำเร็จ', 'success');
        await loadClassroomDetail(classroomId, navigateTo, modal);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Rename section
    container.querySelectorAll('.rename-section-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newName = prompt('ชื่อหมวดใหม่:', btn.dataset.name);
        if (!newName || !newName.trim()) return;
        try {
          await api(`/sections/${btn.dataset.id}`, {
            method: 'PUT',
            body: JSON.stringify({ name: newName }),
          });
          await loadClassroomDetail(classroomId, navigateTo, modal);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Delete section
    container.querySelectorAll('.delete-section-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`ลบหมวด "${btn.dataset.name}" ? วีดีโอในหมวดจะกลับเป็น "ยังไม่จัดหมวด"`)) return;
        try {
          await api(`/sections/${btn.dataset.id}`, { method: 'DELETE' });
          showToast('ลบหมวดแล้ว', 'success');
          await loadClassroomDetail(classroomId, navigateTo, modal);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Reorder sections up/down
    const reorderSections = async (sectionId, direction) => {
      const ids = sections.map(s => s.id);
      const idx = ids.indexOf(sectionId);
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= ids.length) return;
      [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
      try {
        await api(`/sections/classroom/${classroomId}/reorder`, {
          method: 'PUT',
          body: JSON.stringify({ order: ids }),
        });
        await loadClassroomDetail(classroomId, navigateTo, modal);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };

    container.querySelectorAll('.move-section-up-btn').forEach(btn => {
      btn.addEventListener('click', () => reorderSections(btn.dataset.id, -1));
    });
    container.querySelectorAll('.move-section-down-btn').forEach(btn => {
      btn.addEventListener('click', () => reorderSections(btn.dataset.id, 1));
    });

    // Toggle sort mode
    container.querySelectorAll('.sort-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newMode = btn.dataset.mode === 'date' ? 'manual' : 'date';
        try {
          await api(`/sections/${btn.dataset.id}`, {
            method: 'PUT',
            body: JSON.stringify({ sort_mode: newMode }),
          });
          await loadClassroomDetail(classroomId, navigateTo, modal);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Preview video buttons
    container.querySelectorAll('.preview-video-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigateTo(`/watch/${btn.dataset.id}/${btn.dataset.code}`);
      });
    });

    // Edit video buttons
    container.querySelectorAll('.edit-video-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const v = videos.find(x => x.id === btn.dataset.id);
        if (!v) return;
        editIdInput.value = v.id;
        titleInput.value = v.title;
        fileIdInput.value = v.google_drive_file_id;
        durationInput.value = v.duration || '';
        descInput.value = v.description || '';
        document.getElementById('video-modal-title').textContent = '✏️ แก้ไขวีดีโอ';
        document.getElementById('btn-add-video').textContent = 'บันทึก';
        modal.classList.add('active');
        setTimeout(() => titleInput.focus(), 100);
      });
    });

    // Reorder within manual sections
    container.querySelectorAll('.move-up-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sectionId = btn.dataset.section || null;
        const group = groups.find(g => (g.section?.id ?? 'null') === (sectionId || 'null'));
        if (!group) return;
        const gVids = group.videos;
        const idx = gVids.findIndex(v => v.id === btn.dataset.id);
        if (idx <= 0) return;
        const ids = gVids.map(v => v.id);
        [ids[idx], ids[idx - 1]] = [ids[idx - 1], ids[idx]];
        try {
          await api(`/videos/classroom/${classroomId}/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ order: ids }),
          });
          await loadClassroomDetail(classroomId, navigateTo, modal);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    container.querySelectorAll('.move-down-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sectionId = btn.dataset.section || null;
        const group = groups.find(g => (g.section?.id ?? 'null') === (sectionId || 'null'));
        if (!group) return;
        const gVids = group.videos;
        const idx = gVids.findIndex(v => v.id === btn.dataset.id);
        if (idx < 0 || idx >= gVids.length - 1) return;
        const ids = gVids.map(v => v.id);
        [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
        try {
          await api(`/videos/classroom/${classroomId}/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ order: ids }),
          });
          await loadClassroomDetail(classroomId, navigateTo, modal);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Delete video buttons
    container.querySelectorAll('.delete-video-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(`ลบวีดีโอ "${btn.dataset.title}" ?`)) return;
        try {
          await api(`/videos/${btn.dataset.id}`, { method: 'DELETE' });
          showToast('ลบวีดีโอแล้ว', 'success');
          await loadClassroomDetail(classroomId, navigateTo, modal);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Bulk-select + move
    const bulkBar = document.getElementById('bulk-action-bar');
    const bulkLabel = document.getElementById('bulk-count-label');
    const bulkSelect = document.getElementById('bulk-section-select');

    const updateBulkBar = () => {
      const checked = container.querySelectorAll('.video-select:checked');
      if (checked.length > 0) {
        bulkBar.style.display = 'flex';
        bulkLabel.textContent = `เลือก ${checked.length} รายการ`;
      } else {
        bulkBar.style.display = 'none';
      }
    };

    container.querySelectorAll('.video-select').forEach(cb => {
      cb.addEventListener('change', updateBulkBar);
    });

    document.getElementById('btn-bulk-cancel').addEventListener('click', () => {
      container.querySelectorAll('.video-select').forEach(cb => { cb.checked = false; });
      bulkBar.style.display = 'none';
    });

    document.getElementById('btn-bulk-move').addEventListener('click', async () => {
      let targetSectionId = bulkSelect.value || null;

      if (targetSectionId === '__new__') {
        const name = prompt('ชื่อหมวดใหม่:');
        if (!name || !name.trim()) return;
        try {
          const { section } = await api(`/sections/classroom/${classroomId}`, {
            method: 'POST',
            body: JSON.stringify({ name }),
          });
          targetSectionId = section.id;
        } catch (err) {
          showToast(err.message, 'error');
          return;
        }
      }

      const videoIds = [...container.querySelectorAll('.video-select:checked')].map(cb => cb.dataset.id);
      try {
        await api(`/videos/classroom/${classroomId}/move`, {
          method: 'PUT',
          body: JSON.stringify({ videoIds, section_id: targetSectionId }),
        });
        showToast('ย้ายวีดีโอสำเร็จ', 'success');
        await loadClassroomDetail(classroomId, navigateTo, modal);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

  } catch (err) {
    showToast(err.message, 'error');
    if (err.message.includes('เข้าสู่ระบบ')) logout();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
