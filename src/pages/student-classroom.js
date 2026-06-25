import { api, showToast, navigateTo as nav, setStudentCode, formatDate, groupVideosBySection } from '../utils.js';

export function renderStudentClassroom() {
  return `
    <nav class="navbar">
      <div class="navbar-inner">
        <a href="#/" class="navbar-brand">
          <span class="logo-icon">⚛️</span>
          <span class="brand-text">PhysicsClassroom</span>
        </a>
        <div class="navbar-actions">
          <a href="#/" class="btn btn-ghost btn-sm">🏠 หน้าหลัก</a>
        </div>
      </div>
    </nav>

    <div class="page">
      <div class="container">
        <div id="student-classroom-container">
          <div class="loading-page">
            <div class="spinner"></div>
            <div class="loading-text">กำลังโหลดห้องเรียน...</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function initStudentClassroom(navigateTo, classroomCode) {
  try {
    const { classroom, videos, sections } = await api(`/classrooms/code/${classroomCode}`);

    setStudentCode(classroomCode);

    const container = document.getElementById('student-classroom-container');

    const renderVideoCard = (v, num) => {
      const watched = !!localStorage.getItem(`resume_${v.id}`);
      return `
        <div class="video-item" data-id="${v.id}" data-code="${classroomCode}">
          <div class="video-number">${num}</div>
          <div class="video-thumbnail">
            <div class="thumb-fallback" style="font-size: 2.5rem; color: var(--text-muted);">🎬</div>
            <div class="play-overlay"><div class="play-icon">▶</div></div>
            ${watched ? '<span class="watched-badge">▸ ดูค้างไว้</span>' : ''}
          </div>
          <div class="video-info">
            <div class="video-title">${escapeHtml(v.title)}</div>
            ${v.description ? `<div class="video-desc">${escapeHtml(v.description)}</div>` : ''}
            <div class="video-meta">
              ${v.duration ? `<span>⏱ ${escapeHtml(v.duration)}</span>` : ''}
              <span>📅 ${formatDate(v.created_at)}</span>
            </div>
          </div>
        </div>
      `;
    };

    let bodyHtml;
    if (videos.length === 0) {
      bodyHtml = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">ยังไม่มีวีดีโอในห้องเรียนนี้</div>
        </div>`;
    } else if (sections.length === 0) {
      // No sections — flat list (backward compat)
      bodyHtml = `<div class="video-list">${videos.map((v, i) => renderVideoCard(v, i + 1)).join('')}</div>`;
    } else {
      const groups = groupVideosBySection(videos, sections);
      let globalNum = 1;
      bodyHtml = groups.map((group, gi) => {
        const { section, videos: gVids } = group;
        const sectionKey = section ? section.id : 'ungrouped';
        const sectionLabel = section ? escapeHtml(section.name) : 'ทั่วไป';
        const isFirstGroup = gi === 0;
        const isOpen = isFirstGroup || localStorage.getItem(`sec_open_${sectionKey}`) === '1';

        const cardsHtml = gVids.map(v => {
          const card = renderVideoCard(v, globalNum);
          globalNum++;
          return card;
        }).join('');

        return `
          <div class="accordion-section ${isOpen ? 'open' : ''}" data-key="${sectionKey}">
            <button class="accordion-header" type="button">
              <span class="accordion-chevron">▶</span>
              <span class="accordion-title">${sectionLabel}</span>
              <span class="accordion-count">${gVids.length} วีดีโอ</span>
            </button>
            <div class="accordion-body">
              <div class="video-list">${cardsHtml}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    container.innerHTML = `
      <div style="margin-bottom: var(--space-2xl);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: var(--space-sm);">
          <div style="width: 16px; height: 16px; border-radius: 50%; background: ${classroom.cover_color};"></div>
          <h1 style="font-size: 1.75rem;">${escapeHtml(classroom.name)}</h1>
        </div>
        ${classroom.description ? `<p style="color: var(--text-secondary);">${escapeHtml(classroom.description)}</p>` : ''}
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: var(--space-sm);">📹 ${videos.length} วีดีโอ</p>
      </div>
      ${bodyHtml}
    `;

    // Accordion toggle
    container.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.closest('.accordion-section');
        const key = section.dataset.key;
        const isNowOpen = section.classList.toggle('open');
        if (key !== 'ungrouped') {
          if (isNowOpen) localStorage.setItem(`sec_open_${key}`, '1');
          else localStorage.removeItem(`sec_open_${key}`);
        }
      });
    });

    // Click to watch video
    container.querySelectorAll('.video-item').forEach(item => {
      item.addEventListener('click', () => {
        navigateTo(`/watch/${item.dataset.id}/${item.dataset.code}`);
      });
    });

  } catch (err) {
    const container = document.getElementById('student-classroom-container');
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-text">${err.message || 'ไม่พบห้องเรียนนี้'}</div>
        <a href="#/" class="btn btn-primary">กลับหน้าหลัก</a>
      </div>
    `;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
