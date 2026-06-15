export function renderHome() {
  return `
    <div class="hero">
      <div class="hero-badge">
        ⚛️ Physics Video Classroom
      </div>
      <h1 class="hero-title">
        ห้องเรียน<span class="gradient-text">ฟิสิกส์</span><br>
        ออนไลน์
      </h1>
      <p class="hero-subtitle">
        ดูวีดีโอการสอนฟิสิกส์ได้ทุกที่ทุกเวลา ปรับความเร็ว เลื่อนไป-กลับ เหมือนดูใน YouTube
      </p>
      <div class="hero-actions">
        <button class="btn btn-primary btn-lg" id="btn-join-class">
          🎓 เข้าห้องเรียน
        </button>
        <button class="btn btn-secondary btn-lg" id="btn-admin-login">
          👨‍🏫 อาจารย์เข้าสู่ระบบ
        </button>
      </div>
      <div class="hero-features">
        <div class="card feature-card">
          <div class="feature-icon">🎬</div>
          <div class="feature-title">ดูวีดีโอสอน</div>
          <div class="feature-desc">สตรีมวีดีโอจาก Google Drive โดยไม่ต้องดาวน์โหลด</div>
        </div>
        <div class="card feature-card">
          <div class="feature-icon">⚡</div>
          <div class="feature-title">ปรับความเร็ว</div>
          <div class="feature-desc">เร่ง-ช้า 0.5x ถึง 2x เลื่อนไปข้างหน้า-ย้อนกลับ</div>
        </div>
        <div class="card feature-card">
          <div class="feature-icon">🔒</div>
          <div class="feature-title">กลุ่มเฉพาะ</div>
          <div class="feature-desc">แชร์เฉพาะนักเรียนในกลุ่มด้วยรหัสเข้ากลุ่ม</div>
        </div>
      </div>
    </div>

    <!-- Join Classroom Modal -->
    <div class="modal-overlay" id="join-modal">
      <div class="modal">
        <h2 class="modal-title">🎓 เข้าห้องเรียน</h2>
        <p class="modal-subtitle">กรอกรหัสกลุ่มที่อาจารย์ให้มา</p>
        <div class="form-group">
          <input type="text"
            class="form-input code-input"
            id="join-code-input"
            placeholder="XXXXXX"
            maxlength="6"
            autocomplete="off"
            spellcheck="false"
          />
          <span class="form-hint">รหัส 6 ตัวอักษร เช่น ABC123</span>
        </div>
        <div id="join-error" style="color: var(--danger); font-size: 0.9rem; margin-bottom: 16px; display: none;"></div>
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-primary" id="btn-submit-join" style="flex:1">เข้ากลุ่ม</button>
          <button class="btn btn-secondary" id="btn-cancel-join">ยกเลิก</button>
        </div>
      </div>
    </div>
  `;
}

export function initHome(navigateTo) {
  const joinModal = document.getElementById('join-modal');

  document.getElementById('btn-join-class').addEventListener('click', () => {
    joinModal.classList.add('active');
    setTimeout(() => document.getElementById('join-code-input').focus(), 100);
  });

  document.getElementById('btn-cancel-join').addEventListener('click', () => {
    joinModal.classList.remove('active');
  });

  document.getElementById('btn-admin-login').addEventListener('click', () => {
    navigateTo('/admin/login');
  });

  // Close modal on overlay click
  joinModal.addEventListener('click', (e) => {
    if (e.target === joinModal) {
      joinModal.classList.remove('active');
    }
  });

  // Join form submit
  const submitJoin = async () => {
    const codeInput = document.getElementById('join-code-input');
    const errorEl = document.getElementById('join-error');
    const code = codeInput.value.trim().toUpperCase();

    if (code.length < 4) {
      errorEl.textContent = 'กรุณากรอกรหัสกลุ่มให้ครบ';
      errorEl.style.display = 'block';
      return;
    }

    try {
      const { api, setStudentCode } = await import('../utils.js');
      const data = await api('/auth/join-classroom', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });

      setStudentCode(code);
      navigateTo(`/classroom/${code}`);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  };

  document.getElementById('btn-submit-join').addEventListener('click', submitJoin);
  document.getElementById('join-code-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitJoin();
  });

  // Auto-uppercase
  document.getElementById('join-code-input').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
  });

  // Check if URL has a code parameter (from shared link)
  const hash = window.location.hash;
  const codeMatch = hash.match(/\/join\/([A-Za-z0-9]+)/);
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    import('../utils.js').then(({ setStudentCode }) => {
      setStudentCode(code);
      navigateTo(`/classroom/${code}`);
    });
  }
}
