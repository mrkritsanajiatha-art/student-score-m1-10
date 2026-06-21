/* ============================================================================
 *  api.js - ชั้นเชื่อมต่อ Google Apps Script REST API
 * ----------------------------------------------------------------------------
 *  หมายเหตุเรื่อง CORS:
 *  - คำขออ่าน (GET) ใช้ query string ได้ตามปกติ
 *  - คำขอเขียน (POST) ส่งแบบ text/plain เพื่อหลีกเลี่ยง preflight (CORS) ของ
 *    Apps Script โดยฝั่ง Backend จะ JSON.parse(e.postData.contents) เอง
 * ========================================================================== */

const API = {
  /** เรียกแบบ GET พร้อมพารามิเตอร์ */
  async get(action, params = {}) {
    const url = new URL(CONFIG.API_URL);
    url.searchParams.set('action', action);
    Object.keys(params).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null) url.searchParams.set(k, params[k]);
    });
    const res = await fetch(url.toString(), { method: 'GET' });
    return res.json();
  },

  /** เรียกแบบ POST (text/plain เพื่อเลี่ยง CORS preflight) */
  async post(action, body = {}) {
    const res = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, body))
    });
    return res.json();
  },

  // ---- Endpoints ----
  students()              { return this.get('students'); },
  student(id)             { return this.get('student', { id: id }); },
  leaderboard()           { return this.get('leaderboard'); },
  dashboard()             { return this.get('dashboard'); },
  history(id, limit)      { return this.get('history', { id: id, limit: limit }); },
  random()                { return this.get('random'); },
  login(username, password) { return this.post('login', { username, password }); },
  updateScore(payload)    { return this.post('updateScore', payload); }
};

/** ตรวจสอบว่าตั้งค่า API_URL แล้วหรือยัง */
function ensureApiConfigured() {
  if (!CONFIG.API_URL || CONFIG.API_URL.indexOf('PASTE_YOUR') === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'ยังไม่ได้ตั้งค่า API',
      html: 'กรุณาวาง URL ของ Google Apps Script Web App ในไฟล์ <code>js/config.js</code>',
      confirmButtonText: 'เข้าใจแล้ว'
    });
    return false;
  }
  return true;
}
