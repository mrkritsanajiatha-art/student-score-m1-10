/* ============================================================================
 *  qr.js - สร้างและจัดการ QR Code (ดาวน์โหลด/บันทึก/แชร์/พิมพ์/เต็มจอ/บัตร)
 *  ใช้ไลบรารี QRCode.js (davidshimjs) + html2canvas + jsPDF
 * ========================================================================== */

const QRUtil = {
  /**
   * สร้าง QR Code ลงใน element
   * @param {HTMLElement} el  - กล่องที่จะวาด QR
   * @param {object} student - {studentId, qrId}
   * @param {number} size
   */
  render(el, student, size = 220) {
    el.innerHTML = '';
    // รูปแบบข้อมูลใน QR ตามสเปก
    const payload = JSON.stringify({ studentId: String(student.studentId), qrId: String(student.qrId) });
    return new QRCode(el, {
      text: payload,
      width: size,
      height: size,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  },

  /** ดึง dataURL (PNG) จากกล่อง QR */
  getDataUrl(el) {
    const canvas = el.querySelector('canvas');
    if (canvas) return canvas.toDataURL('image/png');
    const img = el.querySelector('img');
    return img ? img.src : null;
  },

  /** 1) ดาวน์โหลด / 2) บันทึกลงเครื่อง (PNG) */
  download(el, filename) {
    const url = this.getDataUrl(el);
    if (!url) return toastError('ยังไม่มี QR Code');
    const a = document.createElement('a');
    a.href = url;
    a.download = (filename || 'qrcode') + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    toastSuccess('ดาวน์โหลด QR Code แล้ว');
  },

  /** 3) แชร์ QR Code (Web Share API) */
  async share(el, student) {
    const url = this.getDataUrl(el);
    if (!url) return toastError('ยังไม่มี QR Code');
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], 'qr_' + student.studentId + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'QR Code นักเรียน', text: student.name });
      } else if (navigator.share) {
        await navigator.share({ title: 'QR Code นักเรียน', text: student.name });
      } else {
        this.download(el, 'qr_' + student.studentId);
        toastInfo('อุปกรณ์ไม่รองรับการแชร์ จึงดาวน์โหลดแทน');
      }
    } catch (e) { /* ผู้ใช้ยกเลิกการแชร์ */ }
  },

  /** 4) พิมพ์ QR Code */
  print(el, student) {
    const url = this.getDataUrl(el);
    if (!url) return toastError('ยังไม่มี QR Code');
    const w = window.open('', '_blank');
    w.document.write(
      '<html><head><title>พิมพ์ QR Code</title></head><body style="text-align:center;font-family:sans-serif;padding:40px">' +
      '<h2>' + escapeHtml(student.name) + '</h2>' +
      '<p>เลขที่ ' + escapeHtml(student.no) + ' | รหัส ' + escapeHtml(student.studentId) + '</p>' +
      '<img src="' + url + '" style="width:300px"/>' +
      '<script>window.onload=function(){window.print();}<\/script>' +
      '</body></html>'
    );
    w.document.close();
  },

  /** 5) แสดง QR แบบเต็มจอ */
  fullscreen(el, student) {
    const url = this.getDataUrl(el);
    if (!url) return toastError('ยังไม่มี QR Code');
    Swal.fire({
      title: escapeHtml(student.name),
      html: '<p class="text-soft">เลขที่ ' + escapeHtml(student.no) + ' | รหัส ' + escapeHtml(student.studentId) + '</p>' +
            '<img src="' + url + '" style="width:min(80vw,360px)"/>',
      showConfirmButton: true,
      confirmButtonText: 'ปิด',
      width: 'auto'
    });
  },

  /** ดาวน์โหลดบัตรนักเรียน (QR Card) เป็น PNG */
  async downloadCardPng(cardEl, student) {
    const canvas = await html2canvas(cardEl, { scale: 3, backgroundColor: null });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'card_' + student.studentId + '.png';
    document.body.appendChild(a); a.click(); a.remove();
    toastSuccess('ดาวน์โหลดบัตรนักเรียน (PNG) แล้ว');
  },

  /** ดาวน์โหลดบัตรนักเรียนเป็น PDF (A4 พร้อมพิมพ์) */
  async downloadCardPdf(cardEl, student) {
    const canvas = await html2canvas(cardEl, { scale: 3, backgroundColor: null });
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4'); // A4
    const pageW = 210, pageH = 297;
    const imgW = 90;
    const imgH = (canvas.height / canvas.width) * imgW;
    pdf.addImage(imgData, 'PNG', (pageW - imgW) / 2, 30, imgW, imgH);
    pdf.save('card_' + student.studentId + '.pdf');
    toastSuccess('ดาวน์โหลดบัตรนักเรียน (PDF) แล้ว');
  }
};
