/* ============================================================================
 *  student.js - หน้าโปรไฟล์นักเรียน (student.html?id=29637)
 * ========================================================================== */

document.getElementById('nav').innerHTML = renderNavbar('');
initTheme();

window.addEventListener('DOMContentLoaded', async function () {
  if (!ensureApiConfigured()) return;

  const id = new URLSearchParams(location.search).get('id');
  const profile = document.getElementById('profile');
  const histBox = document.getElementById('historyBox');

  if (!id) {
    profile.innerHTML = '<div class="glass"><p class="mb-0">ไม่พบรหัสนักเรียนใน URL<br>ตัวอย่าง: <code>student.html?id=29601</code></p></div>';
    return;
  }

  try {
    const res = await API.student(id);
    if (!res.success) {
      profile.innerHTML = '<div class="glass"><p class="mb-0">ไม่พบข้อมูลนักเรียน</p></div>';
      return;
    }
    profile.innerHTML = renderStudentCard(res.student);
    afterRenderStudentCard(res.student);
    histBox.innerHTML = renderHistoryTable(res.student.history);
  } catch (e) {
    profile.innerHTML = '<div class="glass"><p class="mb-0">เกิดข้อผิดพลาดในการโหลดข้อมูล</p></div>';
  }
});
