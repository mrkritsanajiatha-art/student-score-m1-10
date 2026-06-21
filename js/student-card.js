/* ============================================================================
 *  student-card.js - การ์ดข้อมูลนักเรียน + QR (ใช้ร่วมกันหลายหน้า)
 * ========================================================================== */

let CUR_STUDENT = null, qrEl = null, cardEl = null;

/** สร้าง HTML การ์ดข้อมูลนักเรียน + QR Code + บัตรนักเรียน */
function renderStudentCard(s) {
  const pct = Math.round((s.score / (s.maxScore || CONFIG.MAX_SCORE)) * 100);
  return '' +
  '<div class="glass">' +
    '<div class="d-flex align-items-center gap-3 flex-wrap">' +
      '<div class="avatar lg">' + escapeHtml(initials(s.name)) + '</div>' +
      '<div class="flex-grow-1">' +
        '<h3 class="mb-1 fw-bold">' + escapeHtml(s.name) + '</h3>' +
        '<div class="text-soft">เลขที่ ' + escapeHtml(s.no) + ' · รหัสนักเรียน ' + escapeHtml(s.studentId) + '</div>' +
        '<div class="mt-1"><span class="badge-pill" style="background:rgba(37,99,235,.15);color:var(--primary)">🏅 อันดับที่ ' + (s.rank || '-') + ' ในห้อง</span></div>' +
      '</div>' +
      '<div class="text-center">' +
        '<div style="font-size:2.6rem;font-weight:800;line-height:1;color:' + scoreColor(s.score) + '">' + s.score + '</div>' +
        '<div class="text-soft">/ ' + (s.maxScore || CONFIG.MAX_SCORE) + ' คะแนน</div>' +
      '</div>' +
    '</div>' +
    '<div class="mt-3">' +
      '<div class="d-flex justify-content-between mb-1"><span class="text-soft">ความก้าวหน้าคะแนน</span><span class="fw-bold">' + pct + '%</span></div>' +
      '<div class="progress-wrap"><div class="progress-bar-fill" style="width:' + pct + '%;background:' + scoreColor(s.score) + '">' + pct + '%</div></div>' +
    '</div>' +
  '</div>' +

  // ---- ส่วน QR Code ----
  '<div class="glass">' +
    '<div class="row g-4 align-items-center">' +
      '<div class="col-md-5 text-center">' +
        '<div id="qrcode" class="qr-box d-inline-flex"></div>' +
        '<div class="qr-actions">' +
          '<button class="btn-soft" onclick="QRUtil.download(qrEl,\'qr_' + s.studentId + '\')">⬇️ ดาวน์โหลด</button>' +
          '<button class="btn-soft" onclick="QRUtil.download(qrEl,\'qr_' + s.studentId + '\')">💾 บันทึกรูป</button>' +
          '<button class="btn-soft" onclick="QRUtil.share(qrEl, CUR_STUDENT)">🔗 แชร์</button>' +
          '<button class="btn-soft" onclick="QRUtil.print(qrEl, CUR_STUDENT)">🖨️ พิมพ์</button>' +
          '<button class="btn-soft" onclick="QRUtil.fullscreen(qrEl, CUR_STUDENT)">⛶ เต็มจอ</button>' +
        '</div>' +
      '</div>' +
      '<div class="col-md-7">' +
        '<h5 class="fw-bold mb-2">🎫 บัตรนักเรียน (QR Card)</h5>' +
        '<div id="idCard" class="id-card">' +
          '<div class="school-logo">🏫</div>' +
          '<div class="school-name">' + escapeHtml(CONFIG.SCHOOL_NAME) + '</div>' +
          '<div style="font-size:.85rem;opacity:.9">' + escapeHtml(CONFIG.CLASS_NAME) + '</div>' +
          '<div class="id-qr" id="cardQr"></div>' +
          '<div class="id-name">' + escapeHtml(s.name) + '</div>' +
          '<div class="id-meta">เลขที่ ' + escapeHtml(s.no) + ' · รหัส ' + escapeHtml(s.studentId) + '</div>' +
        '</div>' +
        '<div class="qr-actions mt-3">' +
          '<button class="btn-soft" onclick="QRUtil.downloadCardPng(cardEl, CUR_STUDENT)">🖼️ บัตร PNG</button>' +
          '<button class="btn-soft" onclick="QRUtil.downloadCardPdf(cardEl, CUR_STUDENT)">📄 บัตร PDF</button>' +
          '<a class="btn-soft text-decoration-none" href="student.html?id=' + s.studentId + '">👤 หน้าโปรไฟล์</a>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

/** เรียกหลัง render การ์ด: สร้าง QR ทั้งสองจุด */
function afterRenderStudentCard(s) {
  CUR_STUDENT = s;
  qrEl = document.getElementById('qrcode');
  cardEl = document.getElementById('idCard');
  QRUtil.render(qrEl, s, 200);
  QRUtil.render(document.getElementById('cardQr'), s, 130);
}

/** สร้าง HTML ตารางประวัติการได้รับ/หักคะแนน */
function renderHistoryTable(history) {
  if (!history || !history.length) {
    return '<div class="glass"><h5 class="fw-bold mb-2">📜 ประวัติคะแนน</h5><p class="text-soft mb-0">ยังไม่มีประวัติ</p></div>';
  }
  const rows = history.map(function (h) {
    const sign = h.change > 0 ? '+' : '';
    const color = h.change > 0 ? 'var(--success)' : 'var(--danger)';
    return '<tr>' +
      '<td class="text-soft" style="white-space:nowrap">' + escapeHtml(h.timestamp) + '</td>' +
      '<td>' + escapeHtml(h.remark) + '</td>' +
      '<td class="fw-bold text-center" style="color:' + color + '">' + sign + h.change + '</td>' +
      '<td class="text-center fw-bold">' + h.newScore + '</td>' +
    '</tr>';
  }).join('');
  return '<div class="glass">' +
    '<h5 class="fw-bold mb-3">📜 ประวัติการได้รับคะแนน</h5>' +
    '<div class="table-responsive"><table class="table align-middle mb-0">' +
      '<thead><tr><th>เวลา</th><th>หมายเหตุ</th><th class="text-center">เปลี่ยน</th><th class="text-center">คงเหลือ</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table></div>' +
  '</div>';
}
