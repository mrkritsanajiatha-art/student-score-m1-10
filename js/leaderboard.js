/* ============================================================================
 *  leaderboard.js - หน้าอันดับคะแนน (ค้นหา / กรอง / เรียง)
 * ========================================================================== */

document.getElementById('nav').innerHTML = renderNavbar('leaderboard.html');
initTheme();

let LB_DATA = [];

window.addEventListener('DOMContentLoaded', async function () {
  if (!ensureApiConfigured()) return;
  try {
    const res = await API.leaderboard();
    LB_DATA = res.success ? res.leaderboard : [];
    renderLB();
  } catch (e) {
    document.getElementById('lbList').innerHTML = '<p class="text-soft">โหลดข้อมูลไม่สำเร็จ</p>';
  }

  document.getElementById('lbSearch').addEventListener('input', renderLB);
  document.getElementById('lbSort').addEventListener('change', renderLB);
});

/** เหรียญตามอันดับ */
function medal(rank) {
  if (rank === 1) return '🏆';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return rank;
}

function renderLB() {
  const q = document.getElementById('lbSearch').value.trim().toLowerCase();
  const sort = document.getElementById('lbSort').value;

  let list = LB_DATA.filter(function (s) {
    return !q || String(s.no) === q ||
      String(s.studentId).toLowerCase().indexOf(q) !== -1 ||
      String(s.name).toLowerCase().indexOf(q) !== -1;
  });

  if (sort === 'scoreAsc') list = list.slice().sort(function (a, b) { return a.score - b.score; });
  else if (sort === 'no') list = list.slice().sort(function (a, b) { return Number(a.no) - Number(b.no); });
  // 'rank' = ตามลำดับเดิม (มาจาก backend แล้ว)

  const box = document.getElementById('lbList');
  if (!list.length) { box.innerHTML = '<p class="text-soft mb-0">ไม่พบนักเรียน</p>'; return; }

  box.innerHTML = list.map(function (s) {
    const rankCls = s.rank <= 3 ? ' rank-' + s.rank : '';
    return '<div class="lb-row' + rankCls + '" style="cursor:pointer" onclick="location.href=\'student.html?id=' + s.studentId + '\'">' +
      '<div class="lb-rank">' + medal(s.rank) + '</div>' +
      '<div class="avatar" style="width:44px;height:44px;font-size:1rem">' + escapeHtml(initials(s.name)) + '</div>' +
      '<div class="lb-name">' + escapeHtml(s.name) +
        '<div class="lb-meta">เลขที่ ' + escapeHtml(s.no) + ' · รหัส ' + escapeHtml(s.studentId) + '</div>' +
      '</div>' +
      '<div class="lb-score" style="color:' + scoreColor(s.score) + '">' + s.score + '</div>' +
    '</div>';
  }).join('');
}
