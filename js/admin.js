/* ============================================================================
 *  admin.js - แผงควบคุมแอดมิน (Login / Dashboard / Scanner / Random / Reports)
 * ========================================================================== */

document.getElementById('nav').innerHTML = renderNavbar('admin.html');
initTheme();

let STUDENTS = [];          // รายชื่อนักเรียนทั้งหมด (มี rank)
let HISTORY = [];           // ประวัติทั้งหมด (สำหรับรายงาน)
let chartDist = null, chartTop = null;
let qrScanner = null;

/* ===================== เริ่มต้น ===================== */
window.addEventListener('DOMContentLoaded', function () {
  if (!ensureApiConfigured()) return;
  if (getToken()) showAdmin();
  else showLogin();

  // Enter เพื่อ login
  document.getElementById('password').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doLogin();
  });

  // สลับแท็บ
  document.querySelectorAll('#adminTabs .nav-link').forEach(function (btn) {
    btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
  });
});

function showLogin() {
  document.getElementById('loginView').style.display = 'block';
  document.getElementById('adminView').style.display = 'none';
}

function showAdmin() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('adminView').style.display = 'block';
  scheduleAutoLogout();
  loadDashboard();
}

/* ===================== Login ===================== */
async function doLogin() {
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value.trim();
  if (!u || !p) return toastError('กรอกชื่อผู้ใช้และรหัสผ่าน');

  Swal.fire({ title: 'กำลังเข้าสู่ระบบ...', didOpen: function () { Swal.showLoading(); }, allowOutsideClick: false });
  try {
    const res = await API.login(u, p);
    Swal.close();
    if (!res.success) return toastError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    saveToken(res.token, res.expiresAt);
    toastSuccess('เข้าสู่ระบบสำเร็จ');
    showAdmin();
  } catch (e) {
    Swal.close();
    toastError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ');
  }
}

/* ===================== สลับแท็บ ===================== */
function switchTab(tab) {
  document.querySelectorAll('#adminTabs .nav-link').forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-pane').forEach(function (p) {
    p.style.display = p.dataset.pane === tab ? 'block' : 'none';
  });
  if (tab !== 'scanner') stopScanner();
  if (tab === 'reports') loadReports();
}

/* ===================== Dashboard ===================== */
async function loadDashboard() {
  try {
    const res = await API.dashboard();
    if (!res.success) return;
    const st = res.stats;

    // การ์ดสถิติ
    document.getElementById('statCards').innerHTML = [
      statCard('👥', 'นักเรียนทั้งหมด', st.total, '#2563eb'),
      statCard('📈', 'คะแนนเฉลี่ย', st.average, '#16a34a'),
      statCard('🏆', 'คะแนนสูงสุด', st.highest, '#f59e0b'),
      statCard('⚠️', 'คะแนนต่ำสุด', st.lowest, '#dc2626')
    ].join('');

    renderCharts(res);
    renderRecent(res.recent);

    // เก็บรายชื่อไว้ใช้ในแท็บอื่น
    const lb = await API.leaderboard();
    if (lb.success) STUDENTS = lb.leaderboard;
  } catch (e) {
    toastError('โหลดแดชบอร์ดไม่สำเร็จ');
  }
}

function statCard(icon, label, value, color) {
  return '<div class="stat-card">' +
    '<div class="icon">' + icon + '</div>' +
    '<div class="label">' + label + '</div>' +
    '<div class="value" style="color:' + color + '">' + value + '</div>' +
  '</div>';
}

function renderCharts(res) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const tick = isDark ? '#cbd5e1' : '#334155';
  Chart.defaults.color = tick;
  Chart.defaults.font.family = 'Sarabun, sans-serif';

  // กราฟการกระจายคะแนน
  if (chartDist) chartDist.destroy();
  chartDist = new Chart(document.getElementById('chartDist'), {
    type: 'bar',
    data: {
      labels: res.distribution.labels,
      datasets: [{ label: 'จำนวนนักเรียน', data: res.distribution.data,
        backgroundColor: ['#dc2626', '#f59e0b', '#eab308', '#3b82f6', '#16a34a'], borderRadius: 8 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
  });

  // กราฟ Top5 / Bottom5
  const top = res.top5 || [], bottom = res.bottom5 || [];
  if (chartTop) chartTop.destroy();
  chartTop = new Chart(document.getElementById('chartTop'), {
    type: 'bar',
    data: {
      labels: top.map(function (s) { return shortName(s.name); }),
      datasets: [{ label: 'คะแนนสูงสุด', data: top.map(function (s) { return s.score; }), backgroundColor: '#16a34a', borderRadius: 6 }]
    },
    options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 100 } } }
  });
}

function shortName(name) {
  const s = String(name || '');
  return s.length > 14 ? s.slice(0, 14) + '…' : s;
}

function renderRecent(recent) {
  const box = document.getElementById('recentActivity');
  if (!recent || !recent.length) { box.innerHTML = '<p class="text-soft mb-0">ยังไม่มีกิจกรรม</p>'; return; }
  box.innerHTML = '<div class="table-responsive"><table class="table align-middle mb-0">' +
    '<thead><tr><th>เวลา</th><th>นักเรียน</th><th class="text-center">เปลี่ยน</th><th>หมายเหตุ</th><th>โดย</th></tr></thead><tbody>' +
    recent.map(function (h) {
      const sign = h.change > 0 ? '+' : '';
      const color = h.change > 0 ? 'var(--success)' : 'var(--danger)';
      return '<tr><td class="text-soft" style="white-space:nowrap">' + escapeHtml(h.timestamp) + '</td>' +
        '<td>' + escapeHtml(h.studentName) + '</td>' +
        '<td class="text-center fw-bold" style="color:' + color + '">' + sign + h.change + '</td>' +
        '<td>' + escapeHtml(h.remark) + '</td>' +
        '<td class="text-soft">' + escapeHtml(h.teacher) + '</td></tr>';
    }).join('') +
    '</tbody></table></div>';
}

/* ===================== QR Scanner ===================== */
function startScanner() {
  if (qrScanner) return;
  document.getElementById('btnStartScan').style.display = 'none';
  document.getElementById('btnStopScan').style.display = 'inline-block';

  qrScanner = new Html5Qrcode('reader');
  qrScanner.start(
    { facingMode: 'environment' }, // กล้องหลัง
    { fps: 10, qrbox: { width: 240, height: 240 } },
    onScanSuccess,
    function () { /* ไม่พบ QR ในเฟรมนี้ - เงียบไว้ */ }
  ).catch(function (err) {
    toastError('ไม่สามารถเปิดกล้องได้: ' + err);
    stopScanner();
  });
}

function stopScanner() {
  document.getElementById('btnStartScan').style.display = 'inline-block';
  document.getElementById('btnStopScan').style.display = 'none';
  if (qrScanner) {
    qrScanner.stop().then(function () { qrScanner.clear(); qrScanner = null; }).catch(function () { qrScanner = null; });
  }
}

let scanLocked = false;
async function onScanSuccess(decodedText) {
  if (scanLocked) return;
  scanLocked = true;
  setTimeout(function () { scanLocked = false; }, 1500); // กันสแกนซ้ำรัว ๆ

  let id = decodedText;
  try {
    const obj = JSON.parse(decodedText); // รูปแบบ {"studentId":"...","qrId":"..."}
    id = obj.qrId || obj.studentId || decodedText;
  } catch (e) { /* ไม่ใช่ JSON - ใช้ข้อความตรง ๆ */ }

  await openScoreDialog(id);
}

function manualLookup() {
  const id = document.getElementById('manualId').value.trim();
  if (!id) return toastError('กรอกรหัสนักเรียน');
  openScoreDialog(id);
}

/* ===================== Score Control Popup ===================== */
let selectedChange = 0;

async function openScoreDialog(id) {
  const res = await API.student(id);
  if (!res.success) {
    if (res.error === 'rate_limited') return toastError('ระบบจำกัดคำขอชั่วคราว รอสักครู่แล้วลองใหม่');
    return toastError('ไม่พบนักเรียน');
  }
  const s = res.student;
  selectedChange = 0;

  const quickRemarks = ['ตอบคำถาม', 'ช่วยงานครู', 'ส่งงานตรงเวลา', 'เข้าเรียนสาย', 'ไม่ส่งงาน', 'ขาดอุปกรณ์'];

  const html =
    '<div class="text-start">' +
      '<div class="d-flex align-items-center gap-3 mb-3">' +
        '<div class="avatar" style="width:60px;height:60px;font-size:1.3rem">' + escapeHtml(initials(s.name)) + '</div>' +
        '<div><div class="fw-bold fs-5">' + escapeHtml(s.name) + '</div>' +
        '<div class="text-soft">เลขที่ ' + escapeHtml(s.no) + ' · รหัส ' + escapeHtml(s.studentId) + '</div>' +
        '<div>คะแนนปัจจุบัน: <b style="color:' + scoreColor(s.score) + '">' + s.score + '</b> / 100</div></div>' +
      '</div>' +
      '<label class="fw-bold mb-1">เพิ่มคะแนน</label>' +
      '<div class="score-btns mb-2">' +
        [1, 2, 5, 10].map(function (n) { return '<button type="button" class="score-btn plus" data-val="' + n + '">+' + n + '</button>'; }).join('') +
      '</div>' +
      '<label class="fw-bold mb-1">หักคะแนน</label>' +
      '<div class="score-btns mb-3">' +
        [1, 2, 5, 10].map(function (n) { return '<button type="button" class="score-btn minus" data-val="-' + n + '">-' + n + '</button>'; }).join('') +
      '</div>' +
      '<label class="fw-bold mb-1">หมายเหตุ (จำเป็น)</label>' +
      '<input id="remarkInput" class="form-control mb-2" placeholder="ระบุเหตุผล..." />' +
      '<div class="d-flex flex-wrap gap-1">' +
        quickRemarks.map(function (r) { return '<button type="button" class="badge-pill quick-remark" style="border:1px solid var(--card-border);background:transparent;cursor:pointer">' + r + '</button>'; }).join('') +
      '</div>' +
    '</div>';

  await Swal.fire({
    title: 'ปรับคะแนนนักเรียน',
    html: html,
    showCancelButton: true,
    confirmButtonText: '✅ ยืนยันบันทึก',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#2563eb',
    didOpen: function () {
      // เลือกคะแนน
      Swal.getPopup().querySelectorAll('.score-btn').forEach(function (b) {
        b.addEventListener('click', function () {
          Swal.getPopup().querySelectorAll('.score-btn').forEach(function (x) { x.classList.remove('selected'); });
          b.classList.add('selected');
          selectedChange = Number(b.dataset.val);
        });
      });
      // หมายเหตุด่วน
      Swal.getPopup().querySelectorAll('.quick-remark').forEach(function (b) {
        b.addEventListener('click', function () { document.getElementById('remarkInput').value = b.textContent; });
      });
    },
    preConfirm: function () {
      const remark = document.getElementById('remarkInput').value.trim();
      if (!selectedChange) { Swal.showValidationMessage('กรุณาเลือกคะแนนที่จะเพิ่ม/หัก'); return false; }
      if (!remark) { Swal.showValidationMessage('กรุณากรอกหมายเหตุ'); return false; }
      return { change: selectedChange, remark: remark };
    }
  }).then(function (result) {
    if (result.isConfirmed && result.value) submitScore(s, result.value.change, result.value.remark);
  });
}

async function submitScore(student, change, remark) {
  try {
    const res = await API.updateScore({
      token: getToken(),
      studentId: student.studentId,
      change: change,
      remark: remark,
      teacher: localStorage.getItem(CONFIG.TOKEN_KEY) ? 'kimzabig11' : 'admin',
      device: detectDevice()
    });
    if (!res.success) {
      if (res.error === 'unauthorized') { toastError('หมดเวลาเข้าสู่ระบบ'); return logout(); }
      return toastError('บันทึกไม่สำเร็จ: ' + res.error);
    }
    toastSuccess('บันทึกแล้ว: ' + (res.change > 0 ? '+' : '') + res.change + ' → ' + res.newScore + ' คะแนน');
    loadDashboard(); // รีเฟรชสถิติ
  } catch (e) {
    toastError('เกิดข้อผิดพลาดในการบันทึก');
  }
}

/* ===================== Random Student ===================== */
async function spinRandom() {
  if (!STUDENTS.length) {
    const lb = await API.leaderboard();
    STUDENTS = lb.success ? lb.leaderboard : [];
  }
  if (!STUDENTS.length) return toastError('ไม่มีข้อมูลนักเรียน');

  const wheel = document.getElementById('wheel');
  const btn = document.getElementById('btnRandom');
  btn.disabled = true;
  wheel.classList.add('spinning');

  // เอฟเฟกต์หมุน (สลับชื่อเร็ว ๆ)
  let ticks = 0;
  const total = 22 + Math.floor(Math.random() * 10);
  const timer = setInterval(function () {
    const r = STUDENTS[Math.floor(Math.random() * STUDENTS.length)];
    wheel.textContent = r.name;
    ticks++;
    if (ticks >= total) {
      clearInterval(timer);
      wheel.classList.remove('spinning');
      const chosen = STUDENTS[Math.floor(Math.random() * STUDENTS.length)];
      wheel.innerHTML = '🎉 ' + escapeHtml(chosen.name) + '<br><span class="text-soft" style="font-size:1rem">เลขที่ ' + escapeHtml(chosen.no) + ' · ' + chosen.score + ' คะแนน</span>';
      btn.disabled = false;
      // ถามว่าจะให้คะแนนเลยไหม
      setTimeout(function () {
        Swal.fire({
          title: 'สุ่มได้: ' + chosen.name,
          text: 'ต้องการให้คะแนนนักเรียนคนนี้เลยหรือไม่?',
          icon: 'success', showCancelButton: true,
          confirmButtonText: 'ให้คะแนนเลย', cancelButtonText: 'ปิด', confirmButtonColor: '#2563eb'
        }).then(function (r) { if (r.isConfirmed) openScoreDialog(chosen.studentId); });
      }, 400);
    }
  }, 80);
}

/* ===================== Reports ===================== */
async function loadReports() {
  const box = document.getElementById('reportTable');
  try {
    const [lb, hist] = await Promise.all([API.leaderboard(), API.history(null, 200)]);
    STUDENTS = lb.success ? lb.leaderboard : [];
    HISTORY = hist.success ? hist.history : [];

    box.innerHTML =
      '<h6 class="fw-bold mb-2">📋 ตารางคะแนนนักเรียน (' + STUDENTS.length + ' คน)</h6>' +
      '<div class="table-responsive mb-4"><table class="table table-striped align-middle mb-0" id="tblScores">' +
        '<thead><tr><th>อันดับ</th><th>เลขที่</th><th>รหัส</th><th>ชื่อ-สกุล</th><th class="text-center">คะแนน</th></tr></thead><tbody>' +
        STUDENTS.map(function (s) {
          return '<tr><td>' + s.rank + '</td><td>' + escapeHtml(s.no) + '</td><td>' + escapeHtml(s.studentId) + '</td><td>' + escapeHtml(s.name) + '</td>' +
            '<td class="text-center fw-bold" style="color:' + scoreColor(s.score) + '">' + s.score + '</td></tr>';
        }).join('') +
      '</tbody></table></div>' +
      '<h6 class="fw-bold mb-2">📜 ประวัติการแก้ไขล่าสุด (' + HISTORY.length + ' รายการ)</h6>' +
      '<div class="table-responsive"><table class="table table-sm align-middle mb-0" id="tblHistory">' +
        '<thead><tr><th>เวลา</th><th>นักเรียน</th><th class="text-center">เปลี่ยน</th><th class="text-center">คงเหลือ</th><th>หมายเหตุ</th><th>โดย</th></tr></thead><tbody>' +
        HISTORY.map(function (h) {
          const sign = h.change > 0 ? '+' : '';
          return '<tr><td style="white-space:nowrap">' + escapeHtml(h.timestamp) + '</td><td>' + escapeHtml(h.studentName) + '</td>' +
            '<td class="text-center">' + sign + h.change + '</td><td class="text-center">' + h.newScore + '</td>' +
            '<td>' + escapeHtml(h.remark) + '</td><td>' + escapeHtml(h.teacher) + '</td></tr>';
        }).join('') +
      '</tbody></table></div>';
  } catch (e) {
    box.innerHTML = '<p class="text-soft">โหลดรายงานไม่สำเร็จ</p>';
  }
}

/** Export Excel (.xlsx) ด้วย SheetJS */
function exportExcel() {
  if (!STUDENTS.length) return toastError('ยังไม่มีข้อมูล');
  const wb = XLSX.utils.book_new();

  const scoreData = [['อันดับ', 'เลขที่', 'รหัสนักเรียน', 'ชื่อ-สกุล', 'คะแนน']]
    .concat(STUDENTS.map(function (s) { return [s.rank, s.no, s.studentId, s.name, s.score]; }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(scoreData), 'คะแนน');

  const histData = [['เวลา', 'รหัส', 'ชื่อ', 'คะแนนเดิม', 'เปลี่ยน', 'คะแนนใหม่', 'หมายเหตุ', 'ครู', 'อุปกรณ์']]
    .concat(HISTORY.map(function (h) { return [h.timestamp, h.studentId, h.studentName, h.oldScore, h.change, h.newScore, h.remark, h.teacher, h.device]; }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(histData), 'ประวัติ');

  XLSX.writeFile(wb, 'รายงานคะแนน_' + new Date().toLocaleDateString('th-TH') + '.xlsx');
  toastSuccess('ดาวน์โหลด Excel แล้ว');
}

/** Export PDF — ใช้ html2canvas เพื่อให้ภาษาไทยแสดงถูกต้อง */
async function exportPdf() {
  const el = document.getElementById('reportTable');
  if (!el || !STUDENTS.length) return toastError('ยังไม่มีข้อมูล');
  Swal.fire({ title: 'กำลังสร้าง PDF...', didOpen: function () { Swal.showLoading(); }, allowOutsideClick: false });
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageW = 210, margin = 8;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height / canvas.width) * imgW;
    const pageH = 297 - margin * 2;

    let heightLeft = imgH, position = margin;
    pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position = margin - (imgH - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH);
      heightLeft -= pageH;
    }
    pdf.save('รายงานคะแนน_' + new Date().toLocaleDateString('th-TH') + '.pdf');
    Swal.close();
    toastSuccess('ดาวน์โหลด PDF แล้ว');
  } catch (e) {
    Swal.close();
    toastError('สร้าง PDF ไม่สำเร็จ');
  }
}
