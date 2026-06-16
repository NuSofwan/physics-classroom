import { api, showToast, copyToClipboard, logout, navigateTo as nav } from '../utils.js';

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
      const val = e.target.value;
      // Match file ID from various Google Drive URL formats
      const match = val.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        e.target.value = match[1];
        showToast('File ID ถูกคัดลอกจาก URL อัตโนมัติ', 'info');
      }
    }, 50);
  });

  await loadClassroomDetail(classroomId, navigateTo, modal);
}

async function loadClassroomDetail(classroomId, navigateTo, modal) {
  try {
    const { classroom, videos } = await api(`/videos/classroom/${classroomId}`);

    const container = document.getElementById('classroom-detail-container');
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
          <button class="btn btn-secondary btn-sm" id="btn-copy-code">
            🔑 รหัส: ${classroom.code}
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-copy-link-detail">
            🔗 คัดลอกลิงก์
          </button>
          <button class="btn btn-primary btn-sm" id="btn-show-add-video">
            ➕ เพิ่มวีดีโอ
          </button>
        </div>
      </div>

      <div id="video-list-container">
        ${videos.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🎬</div>
            <div class="empty-text">ยังไม่มีวีดีโอในกลุ่มนี้</div>
            <button class="btn btn-primary" id="btn-first-video">➕ เพิ่มวีดีโอแรก</button>
          </div>
        ` : `
          <h3 style="margin-bottom: var(--space-lg); color: var(--text-secondary);">
            📹 วีดีโอทั้งหมด (${videos.length})
          </h3>
          <div class="video-list">
            ${videos.map((v, i) => `
              <div class="admin-video-item" data-id="${v.id}">
                <div class="video-number">${i + 1}</div>
                <div class="reorder-controls">
                  <button class="reorder-btn move-up-btn" data-id="${v.id}" title="เลื่อนขึ้น" ${i === 0 ? 'disabled' : ''}>▲</button>
                  <button class="reorder-btn move-down-btn" data-id="${v.id}" title="เลื่อนลง" ${i === videos.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <div style="flex:1; min-width:0;">
                  <div class="video-title">${escapeHtml(v.title)}</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-top:4px; word-break:break-all;">
                    ${v.duration ? `⏱ ${escapeHtml(v.duration)} · ` : ''}ID: ${escapeHtml(v.google_drive_file_id.substring(0, 16))}…
                    ${v.description ? ` · ${escapeHtml(v.description.substring(0, 50))}` : ''}
                  </div>
                </div>
                <div class="video-actions">
                  <button class="btn btn-ghost btn-sm preview-video-btn" data-id="${v.id}" data-code="${classroom.code}" title="ดูตัวอย่าง">
                    ▶️
                  </button>
                  <button class="btn btn-ghost btn-sm edit-video-btn" data-id="${v.id}" title="แก้ไข">
                    ✏️
                  </button>
                  <button class="btn btn-danger btn-sm delete-video-btn" data-id="${v.id}" data-title="${escapeHtml(v.title)}" title="ลบ">
                    🗑️
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    // Copy code
    document.getElementById('btn-copy-code').addEventListener('click', () => {
      copyToClipboard(classroom.code);
    });

    // Copy link
    document.getElementById('btn-copy-link-detail').addEventListener('click', () => {
      const link = `${window.location.origin}${window.location.pathname}#/join/${classroom.code}`;
      copyToClipboard(link);
    });

    const titleInput = document.getElementById('video-title');
    const fileIdInput = document.getElementById('video-file-id');
    const durationInput = document.getElementById('video-duration');
    const descInput = document.getElementById('video-description');
    const editIdInput = document.getElementById('edit-video-id');

    function resetForm() {
      editIdInput.value = '';
      titleInput.value = '';
      fileIdInput.value = '';
      durationInput.value = '';
      descInput.value = '';
    }

    // Show add video modal
    const showAddModal = () => {
      resetForm();
      document.getElementById('video-modal-title').textContent = '🎬 เพิ่มวีดีโอ';
      document.getElementById('btn-add-video').textContent = 'เพิ่มวีดีโอ';
      fileIdInput.removeAttribute('disabled');
      modal.classList.add('active');
      setTimeout(() => titleInput.focus(), 100);
    };

    document.getElementById('btn-show-add-video').addEventListener('click', showAddModal);

    const firstVideoBtn = document.getElementById('btn-first-video');
    if (firstVideoBtn) {
      firstVideoBtn.addEventListener('click', showAddModal);
    }

    // Add / edit video submit
    document.getElementById('btn-add-video').addEventListener('click', async () => {
      const title = titleInput.value.trim();
      const fileId = fileIdInput.value.trim();
      const duration = durationInput.value.trim();
      const description = descInput.value.trim();
      const editId = editIdInput.value;

      if (!title || !fileId) {
        showToast('กรุณาระบุชื่อและ File ID', 'error');
        return;
      }

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
        resetForm();
        await loadClassroomDetail(classroomId, navigateTo, modal);
      } catch (err) {
        showToast(err.message, 'error');
      }
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

    // Reorder helpers
    const reorder = async (fromIdx, toIdx) => {
      if (toIdx < 0 || toIdx >= videos.length) return;
      const ids = videos.map(v => v.id);
      const [moved] = ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, moved);
      try {
        await api(`/videos/classroom/${classroomId}/reorder`, {
          method: 'PUT',
          body: JSON.stringify({ order: ids }),
        });
        await loadClassroomDetail(classroomId, navigateTo, modal);
      } catch (err) {
        showToast(err.message, 'error');
      }
    };

    container.querySelectorAll('.move-up-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = videos.findIndex(v => v.id === btn.dataset.id);
        reorder(idx, idx - 1);
      });
    });
    container.querySelectorAll('.move-down-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = videos.findIndex(v => v.id === btn.dataset.id);
        reorder(idx, idx + 1);
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
