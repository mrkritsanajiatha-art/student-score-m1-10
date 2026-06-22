/* ============================================================================
 *  index.js - หน้าค้นหานักเรียน (สาธารณะ ไม่ต้องเข้าสู่ระบบ)
 * ========================================================================== */

let ALL_STUDENTS = [];

document.getElementById('nav').innerHTML = renderNavbar('index.html');
initTheme();

window.addEventListener('DOMContentLoaded', async function () {
  if (!ensureApiConfigured()) return;
  try {
    const res = await API.leaderboard(); // มี rank มาให้แล้ว
    if (res.success) ALL_STUDENTS = res.leaderboard;
  } catch (e) {
    toastError('โหลดข้อมูลไม่สำเร็จ');
  }

  renderRoster(); // แสดงรายชื่อนักเรียนทั้งหมดให้กดเลือกได้

  // ค้นหาแบบเรียลไทม์
  const input = document.getElementById('searchInput');
  input.addEventListener('input', doSearch);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSearch(); });
});

/** ค้นหาจากคำค้น (เลขที่/รหัส/ชื่อ/นามสกุล) */
function doSearch() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const box = document.getElementById('searchResults');
  document.getElementById('studentDetail').innerHTML = '';

  if (!q) { box.innerHTML = ''; return; }

  const matches = ALL_STUDENTS.filter(function (s) {
    return String(s.no) === q ||
           String(s.studentId).toLowerCase().indexOf(q) !== -1 ||
           String(s.name).toLowerCase().indexOf(q) !== -1;
  }).slice(0, 12);

  if (!matches.length) {
    box.innerHTML = '<div class="empty-state"><span class="empty-emoji">😔</span>ไม่พบข้อมูลนักเรียน ลองพิมพ์ใหม่อีกครั้งนะ</div>';
    return;
  }

  box.innerHTML = matches.map(function (s) {
    return '<div class="lb-row" style="cursor:pointer" onclick="showStudent(\'' + s.studentId + '\')">' +
      '<div class="avatar" style="width:46px;height:46px;font-size:1rem">' + escapeHtml(initials(s.name)) + '</div>' +
      '<div class="lb-name">' + escapeHtml(s.name) +
        '<div class="lb-meta">เลขที่ ' + escapeHtml(s.no) + ' · รหัส ' + escapeHtml(s.studentId) + '</div>' +
      '</div>' +
      '<div class="lb-score" style="color:' + scoreColor(s.score) + '">' + s.score + '</div>' +
    '</div>';
  }).join('');
}

/** แสดงรายชื่อนักเรียนทั้งหมด (เรียงตามเลขที่) ให้กดเลือกได้โดยไม่ต้องค้นหา */
function renderRoster() {
  const box = document.getElementById('studentRoster');
  if (!box) return;
  if (!ALL_STUDENTS.length) {
    box.innerHTML = '<p class="text-soft mb-0">ยังไม่มีรายชื่อนักเรียน</p>';
    return;
  }
  const list = ALL_STUDENTS.slice().sort(function (a, b) { return Number(a.no) - Number(b.no); });
  box.innerHTML = list.map(function (s) {
    return '<button type="button" class="roster-item" onclick="showStudent(\'' + s.studentId + '\')">' +
      '<span class="roster-no">' + escapeHtml(s.no) + '</span>' +
      '<span class="roster-name">' + escapeHtml(s.name) + '</span>' +
    '</button>';
  }).join('');
}

/** แสดงรายละเอียดนักเรียน + QR (ใช้ renderStudentCard จาก student-card.js) */
async function showStudent(studentId) {
  const detail = document.getElementById('studentDetail');
  detail.innerHTML = '<div class="glass spinner-center"><div class="spinner-border text-primary"></div></div>';
  try {
    const res = await API.student(studentId);
    if (!res.success) { detail.innerHTML = ''; return toastError('ไม่พบข้อมูลนักเรียน'); }
    detail.innerHTML = renderStudentCard(res.student);
    afterRenderStudentCard(res.student);
    detail.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    detail.innerHTML = '';
    toastError('เกิดข้อผิดพลาด');
  }
}
