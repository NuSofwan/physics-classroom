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

    <!-- Add Video Modal -->
    <div class="modal-overlay" id="add-video-modal">
      <div class="modal">
        <h2 class="modal-title">🎬 เพิ่มวีดีโอ</h2>
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
            จาก URL: https://drive.google.com/file/d/<b>FILE_ID</b>/view → คัดลอกส่วน FILE_ID
          </span>
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
              <div class="admin-video-item">
                <div class="video-number">${i + 1}</div>
                <div style="flex:1;">
                  <div class="video-title">${escapeHtml(v.title)}</div>
                  <div style="font-size: 0.8rem; color: var(--text-muted); margin-top:4px;">
                    ID: ${v.google_drive_file_id.substring(0, 20)}...
                    ${v.description ? ` · ${escapeHtml(v.description).substring(0, 50)}` : ''}
                  </div>
                </div>
                <div class="video-actions">
                  <button class="btn btn-ghost btn-sm preview-video-btn" data-id="${v.id}" data-code="${classroom.code}" title="ดูตัวอย่าง">
                    ▶️
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

    // Show add video modal
    const showAddModal = () => {
      modal.classList.add('active');
      setTimeout(() => document.getElementById('video-title').focus(), 100);
    };

    document.getElementById('btn-show-add-video').addEventListener('click', showAddModal);

    const firstVideoBtn = document.getElementById('btn-first-video');
    if (firstVideoBtn) {
      firstVideoBtn.addEventListener('click', showAddModal);
    }

    // Add video submit
    document.getElementById('btn-add-video').addEventListener('click', async () => {
      const title = document.getElementById('video-title').value.trim();
      const fileId = document.getElementById('video-file-id').value.trim();
      const description = document.getElementById('video-description').value.trim();

      if (!title || !fileId) {
        showToast('กรุณาระบุชื่อและ File ID', 'error');
        return;
      }

      try {
        await api(`/videos/classroom/${classroomId}`, {
          method: 'POST',
          body: JSON.stringify({
            title,
            google_drive_file_id: fileId,
            description,
          }),
        });

        showToast('เพิ่มวีดีโอสำเร็จ!', 'success');
        modal.classList.remove('active');

        // Reset form
        document.getElementById('video-title').value = '';
        document.getElementById('video-file-id').value = '';
        document.getElementById('video-description').value = '';

        // Reload
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
