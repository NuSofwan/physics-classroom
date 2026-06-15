import { api, showToast, copyToClipboard, logout, formatDate, navigateTo as nav } from '../utils.js';

const COVER_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1',
];

export function renderAdminDashboard() {
  return `
    <nav class="navbar">
      <div class="navbar-inner">
        <a href="#/" class="navbar-brand">
          <span class="logo-icon">⚛️</span>
          <span class="brand-text">PhysicsClassroom</span>
        </a>
        <div class="navbar-actions">
          <span style="color: var(--text-secondary); font-size: 0.9rem;">👨‍🏫 อาจารย์</span>
          <button class="btn btn-ghost btn-sm" id="btn-logout">ออกจากระบบ</button>
        </div>
      </div>
    </nav>

    <div class="page">
      <div class="container">
        <div class="dashboard-header">
          <h1 class="dashboard-title">📚 ห้องเรียนของฉัน</h1>
          <button class="btn btn-primary" id="btn-new-classroom">
            ➕ สร้างกลุ่มใหม่
          </button>
        </div>

        <div class="stats-row" id="stats-row">
          <div class="card stat-card">
            <div class="stat-value" id="stat-classrooms">-</div>
            <div class="stat-label">กลุ่มเรียน</div>
          </div>
          <div class="card stat-card">
            <div class="stat-value" id="stat-videos">-</div>
            <div class="stat-label">วีดีโอทั้งหมด</div>
          </div>
        </div>

        <div id="classrooms-container">
          <div class="loading-page">
            <div class="spinner"></div>
            <div class="loading-text">กำลังโหลด...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- New Classroom Modal -->
    <div class="modal-overlay" id="new-classroom-modal">
      <div class="modal">
        <h2 class="modal-title">✨ สร้างกลุ่มใหม่</h2>
        <p class="modal-subtitle">สร้างห้องเรียนสำหรับจัดกลุ่มวีดีโอ</p>

        <div class="form-group">
          <label class="form-label">ชื่อกลุ่ม *</label>
          <input type="text" class="form-input" id="new-classroom-name"
            placeholder="เช่น ฟิสิกส์ ม.4 เทอม 1"
          />
        </div>

        <div class="form-group">
          <label class="form-label">คำอธิบาย</label>
          <textarea class="form-textarea" id="new-classroom-desc"
            placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับกลุ่มนี้"
          ></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">สีปก</label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;" id="color-picker">
            ${COVER_COLORS.map(c => `
              <button class="color-swatch ${c === '#6366f1' ? 'selected' : ''}"
                data-color="${c}"
                style="width:32px; height:32px; border-radius:8px; border:2px solid transparent; background:${c}; cursor:pointer; transition: all 0.15s;"
              ></button>
            `).join('')}
          </div>
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="btn btn-primary" id="btn-create-classroom" style="flex:1">สร้างกลุ่ม</button>
          <button class="btn btn-secondary" id="btn-cancel-classroom">ยกเลิก</button>
        </div>
      </div>
    </div>
  `;
}

export async function initAdminDashboard(navigateTo) {
  // Logout
  document.getElementById('btn-logout').addEventListener('click', logout);

  // Load classrooms
  await loadClassrooms(navigateTo);

  // New classroom modal
  const modal = document.getElementById('new-classroom-modal');
  let selectedColor = '#6366f1';

  document.getElementById('btn-new-classroom').addEventListener('click', () => {
    modal.classList.add('active');
    setTimeout(() => document.getElementById('new-classroom-name').focus(), 100);
  });

  document.getElementById('btn-cancel-classroom').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  // Color picker
  document.getElementById('color-picker').addEventListener('click', (e) => {
    const swatch = e.target.closest('[data-color]');
    if (!swatch) return;

    document.querySelectorAll('.color-swatch').forEach(s => {
      s.style.borderColor = 'transparent';
      s.classList.remove('selected');
    });
    swatch.style.borderColor = 'white';
    swatch.classList.add('selected');
    selectedColor = swatch.dataset.color;
  });

  // Create classroom
  document.getElementById('btn-create-classroom').addEventListener('click', async () => {
    const name = document.getElementById('new-classroom-name').value.trim();
    const description = document.getElementById('new-classroom-desc').value.trim();

    if (!name) {
      showToast('กรุณาระบุชื่อกลุ่ม', 'error');
      return;
    }

    try {
      await api('/classrooms', {
        method: 'POST',
        body: JSON.stringify({ name, description, cover_color: selectedColor }),
      });

      showToast('สร้างกลุ่มสำเร็จ!', 'success');
      modal.classList.remove('active');

      // Reset form
      document.getElementById('new-classroom-name').value = '';
      document.getElementById('new-classroom-desc').value = '';

      // Reload
      await loadClassrooms(navigateTo);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function loadClassrooms(navigateTo) {
  try {
    const { classrooms } = await api('/classrooms');

    // Update stats
    document.getElementById('stat-classrooms').textContent = classrooms.length;
    const totalVideos = classrooms.reduce((sum, c) => sum + (c.video_count || 0), 0);
    document.getElementById('stat-videos').textContent = totalVideos;

    const container = document.getElementById('classrooms-container');

    if (classrooms.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <div class="empty-text">ยังไม่มีกลุ่มเรียน</div>
          <button class="btn btn-primary" onclick="document.getElementById('btn-new-classroom').click()">
            ➕ สร้างกลุ่มแรก
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="classroom-grid">
        ${classrooms.map(c => `
          <div class="card classroom-card" data-id="${c.id}">
            <div class="classroom-card-header" style="background: linear-gradient(135deg, ${c.cover_color}88, ${c.cover_color}33)">
              <span class="classroom-card-icon">📚</span>
            </div>
            <div class="classroom-card-body">
              <div class="classroom-card-name">${escapeHtml(c.name)}</div>
              <div class="classroom-card-desc">${escapeHtml(c.description || 'ไม่มีคำอธิบาย')}</div>
              <div class="classroom-card-footer">
                <span class="classroom-code" title="คลิกเพื่อคัดลอกรหัส">${c.code}</span>
                <span class="video-count">📹 ${c.video_count || 0} วีดีโอ</span>
              </div>
            </div>
            <div style="display:flex; gap:8px; margin-top: var(--space-md);">
              <button class="btn btn-secondary btn-sm copy-link-btn" data-code="${c.code}" style="flex:1;">
                🔗 คัดลอกลิงก์
              </button>
              <button class="btn btn-danger btn-sm delete-classroom-btn" data-id="${c.id}" data-name="${escapeHtml(c.name)}">
                🗑️
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Click to manage classroom
    container.querySelectorAll('.classroom-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't navigate if clicking buttons
        if (e.target.closest('button')) return;
        navigateTo(`/admin/classroom/${card.dataset.id}`);
      });
    });

    // Copy link buttons
    container.querySelectorAll('.copy-link-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const code = btn.dataset.code;
        const link = `${window.location.origin}${window.location.pathname}#/join/${code}`;
        copyToClipboard(link);
      });
    });

    // Delete buttons
    container.querySelectorAll('.delete-classroom-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const name = btn.dataset.name;
        if (!confirm(`ต้องการลบกลุ่ม "${name}" จริงหรือ?\nวีดีโอทั้งหมดในกลุ่มจะถูกลบด้วย`)) return;

        try {
          await api(`/classrooms/${btn.dataset.id}`, { method: 'DELETE' });
          showToast('ลบกลุ่มเรียบร้อย', 'success');
          await loadClassrooms(navigateTo);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    // Code click to copy
    container.querySelectorAll('.classroom-code').forEach(code => {
      code.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(code.textContent);
      });
      code.style.cursor = 'pointer';
    });

  } catch (err) {
    showToast(err.message, 'error');
    if (err.message.includes('เข้าสู่ระบบ') || err.message.includes('Session')) {
      logout();
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
