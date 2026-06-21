/* ============================================================================
 *  common.js - ฟังก์ชันที่ใช้ร่วมกันทุกหน้า (ธีม, Toast, ตรวจ Token, ฯลฯ)
 * ========================================================================== */

/* ---------- ธีม (Dark / Light Mode) ---------- */
function initTheme() {
  const saved = localStorage.getItem(CONFIG.THEME_KEY) || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(CONFIG.THEME_KEY, next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
}

/* ---------- Toast แจ้งเตือน ---------- */
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2600,
  timerProgressBar: true
});

function toastSuccess(msg) { Toast.fire({ icon: 'success', title: msg }); }
function toastError(msg)   { Toast.fire({ icon: 'error', title: msg }); }
function toastInfo(msg)    { Toast.fire({ icon: 'info', title: msg }); }

/* ---------- Token / Session ---------- */
function saveToken(token, expiresAt) {
  localStorage.setItem(CONFIG.TOKEN_KEY, token);
  localStorage.setItem(CONFIG.TOKEN_EXP_KEY, String(expiresAt));
}

function getToken() {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  const exp = Number(localStorage.getItem(CONFIG.TOKEN_EXP_KEY) || 0);
  if (!token || Date.now() > exp) { clearToken(); return null; }
  return token;
}

function clearToken() {
  localStorage.removeItem(CONFIG.TOKEN_KEY);
  localStorage.removeItem(CONFIG.TOKEN_EXP_KEY);
}

/** ป้องกันหน้า Admin: ถ้าไม่มี Token ให้เด้งไปหน้า Login */
function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = 'admin.html';
    return null;
  }
  scheduleAutoLogout();
  return token;
}

/** ออกจากระบบอัตโนมัติเมื่อ Token หมดอายุ */
function scheduleAutoLogout() {
  const exp = Number(localStorage.getItem(CONFIG.TOKEN_EXP_KEY) || 0);
  const ms = exp - Date.now();
  if (ms <= 0) { logout(); return; }
  setTimeout(function () {
    Swal.fire({ icon: 'info', title: 'หมดเวลาเข้าสู่ระบบ', text: 'กรุณาเข้าสู่ระบบใหม่' })
      .then(logout);
  }, Math.min(ms, 2147483647));
}

function logout() {
  clearToken();
  window.location.href = 'admin.html';
}

/* ---------- Utilities ---------- */
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** สีตามระดับคะแนน */
function scoreColor(score) {
  if (score >= 80) return '#16a34a';   // เขียว
  if (score >= 60) return '#2563eb';   // น้ำเงิน
  if (score >= 40) return '#f59e0b';   // ส้ม
  return '#dc2626';                    // แดง
}

/** อักษรย่อจากชื่อ (สำหรับ Avatar) */
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/);
  return (parts[0] ? parts[0].charAt(0) : '?') + (parts[1] ? parts[1].charAt(0) : '');
}

/** ชนิดอุปกรณ์ปัจจุบัน (สำหรับบันทึกประวัติ) */
function detectDevice() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mobi/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

/** สร้างแถบนำทางด้านบน (Navbar) ฝังในหน้าที่เรียกใช้ */
function renderNavbar(active) {
  const links = [
    { href: 'index.html', label: '🔍 ค้นหา' },
    { href: 'leaderboard.html', label: '🏆 อันดับ' },
    { href: 'admin.html', label: '🔐 แอดมิน' }
  ];
  const items = links.map(function (l) {
    const cls = active === l.href ? 'nav-link active' : 'nav-link';
    return '<a class="' + cls + '" href="' + l.href + '">' + l.label + '</a>';
  }).join('');

  return '' +
    '<nav class="navbar-custom">' +
      '<a class="brand" href="index.html">📚 ระบบเก็บคะแนน <span>' + escapeHtml(CONFIG.CLASS_NAME) + '</span></a>' +
      '<div class="nav-links">' + items +
        '<button id="themeToggle" class="theme-btn" onclick="toggleTheme()">🌙</button>' +
      '</div>' +
    '</nav>';
}

/* เริ่มต้นธีมทันทีที่โหลด */
initTheme();
