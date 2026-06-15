export function renderAdminLogin() {
  return `
    <div class="page" style="display:flex; align-items:center; justify-content:center; min-height:100vh;">
      <div class="card" style="max-width: 420px; width: 90%;">
        <div style="text-align:center; margin-bottom: var(--space-xl);">
          <div style="font-size: 3rem; margin-bottom: var(--space-md);">👨‍🏫</div>
          <h1 style="font-size: 1.5rem;">อาจารย์เข้าสู่ระบบ</h1>
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: var(--space-sm);">
            ใส่รหัสผ่านเพื่อจัดการห้องเรียน
          </p>
        </div>

        <div class="form-group">
          <label class="form-label">รหัสผ่าน</label>
          <input type="password"
            class="form-input"
            id="admin-password"
            placeholder="กรอกรหัสผ่าน"
            autocomplete="current-password"
          />
        </div>

        <div id="login-error" style="color: var(--danger); font-size: 0.9rem; margin-bottom: 16px; display: none;"></div>

        <button class="btn btn-primary" id="btn-admin-submit" style="width: 100%; margin-bottom: var(--space-md);">
          เข้าสู่ระบบ
        </button>

        <div style="text-align: center;">
          <a href="#/" class="back-link">← กลับหน้าหลัก</a>
        </div>
      </div>
    </div>
  `;
}

export function initAdminLogin(navigateTo) {
  const submitLogin = async () => {
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('login-error');

    if (!password) {
      errorEl.textContent = 'กรุณากรอกรหัสผ่าน';
      errorEl.style.display = 'block';
      return;
    }

    try {
      const { api, showToast } = await import('../utils.js');
      const data = await api('/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });

      localStorage.setItem('admin_token', data.token);
      showToast('เข้าสู่ระบบสำเร็จ!', 'success');
      navigateTo('/admin/dashboard');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  };

  document.getElementById('btn-admin-submit').addEventListener('click', submitLogin);
  document.getElementById('admin-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitLogin();
  });

  // Focus password input
  setTimeout(() => document.getElementById('admin-password').focus(), 100);
}
