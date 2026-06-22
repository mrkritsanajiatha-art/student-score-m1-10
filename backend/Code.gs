/**
 * ============================================================================
 *  ระบบเก็บคะแนนนักเรียน (Student Score Management System) - REST API
 *  Backend: Google Apps Script (Web App)  |  Database: Google Sheets
 * ----------------------------------------------------------------------------
 *  วิธีใช้งาน:
 *   1) เปิด Google Sheet ของคุณ -> เมนู Extensions -> Apps Script
 *   2) วางไฟล์นี้ (Code.gs) และไฟล์ ImportStudents.gs
 *   3) รันฟังก์ชัน setupSheets() และ importStudents() ครั้งแรกเพื่อสร้างข้อมูล
 *   4) Deploy -> New deployment -> Web app
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   5) นำ URL ที่ได้ไปใส่ใน frontend/js/config.js (ตัวแปร API_URL)
 * ============================================================================
 */

// ---------------------------- การตั้งค่าระบบ (CONFIG) ------------------------
const SPREADSHEET_ID = '1owVljsBI0y4qAiT5KPQKiDqV8KEAdbpqbo53XkmmsEs'; // รหัส Google Sheet
const MAIN_SHEET     = 'Sheet1';   // ชีตข้อมูลนักเรียนหลัก
const HISTORY_SHEET  = 'History';  // ชีตเก็บประวัติการแก้ไขคะแนน

// บัญชีผู้ดูแลระบบ (เก็บไว้ที่ Backend เท่านั้น ห้ามใส่ใน Frontend)
const ADMIN_USERNAME = 'kimzabig11';
const ADMIN_PASSWORD = 'kimzabig11';

// กฎคะแนน
const MAX_SCORE = 100;   // คะแนนสูงสุด
const MIN_SCORE = 0;     // คะแนนต่ำสุด
const DEFAULT_SCORE = 100; // คะแนนเริ่มต้น

// Token / ความปลอดภัย
const TOKEN_TTL_SEC = 2 * 60 * 60;     // อายุ Token = 2 ชั่วโมง
const RATE_LIMIT_MAX = 120;            // คำขอสูงสุดต่อ 1 นาที (ต่อผู้ใช้ ต่อ action)
const CACHE_STUDENTS_SEC = 25;         // แคชรายชื่อนักเรียน (วินาที)

// ลำดับคอลัมน์ใน Sheet1 (เริ่มที่ 1)
const COL = { NO: 1, SID: 2, NAME: 3, SCORE: 4, QR: 5 };

// ============================================================================
//  ROUTER - ตัวจัดเส้นทาง API
// ============================================================================

/** รับคำขอแบบ GET (สำหรับการอ่านข้อมูล) */
function doGet(e) {
  try {
    const action = String((e.parameter && e.parameter.action) || '').toLowerCase();
    if (!checkRateLimit_(e, action, e.parameter && e.parameter.token)) return json_({ success: false, error: 'rate_limited' });

    switch (action) {
      case 'students':    return json_(getStudents_());
      case 'student':     return json_(getStudent_(e.parameter.id));
      case 'leaderboard': return json_(getLeaderboard_());
      case 'dashboard':   return json_(getDashboard_());
      case 'history':     return json_(getHistory_(e.parameter.id, e.parameter.limit));
      case 'random':      return json_(getRandom_());
      case 'ping':        return json_({ success: true, message: 'pong', time: now_() });
      default:            return json_({ success: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

/** รับคำขอแบบ POST (สำหรับการเขียน/แก้ไขข้อมูล) */
function doPost(e) {
  try {
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const action = String(body.action || '').toLowerCase();
    if (!checkRateLimit_(e, action, body.token)) return json_({ success: false, error: 'rate_limited' });

    switch (action) {
      case 'login':       return json_(login_(body));
      case 'updatescore': return json_(updateScore_(body));
      default:            return json_({ success: false, error: 'unknown_action' });
    }
  } catch (err) {
    return json_({ success: false, error: String(err) });
  }
}

// ============================================================================
//  AUTH - ระบบยืนยันตัวตน (Login / Token)
// ============================================================================

/** เข้าสู่ระบบ: ตรวจสอบ user/pass แล้วออก Token */
function login_(body) {
  const u = String(body.username || '').trim();
  const p = String(body.password || '').trim();

  if (u !== ADMIN_USERNAME || p !== ADMIN_PASSWORD) {
    return { success: false, error: 'invalid_credentials' };
  }

  const token = Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  // เก็บ Token ไว้ใน Cache พร้อมเวลาหมดอายุ
  cache.put('tok_' + token, JSON.stringify({ user: u, exp: Date.now() + TOKEN_TTL_SEC * 1000 }), TOKEN_TTL_SEC);

  return {
    success: true,
    token: token,
    username: u,
    expiresIn: TOKEN_TTL_SEC,
    expiresAt: Date.now() + TOKEN_TTL_SEC * 1000
  };
}

/** ตรวจสอบความถูกต้องของ Token */
function validateToken_(token) {
  if (!token) return null;
  const raw = CacheService.getScriptCache().get('tok_' + token);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (Date.now() > data.exp) return null; // หมดอายุ
    return data;
  } catch (e) {
    return null;
  }
}

// ============================================================================
//  STUDENTS - ข้อมูลนักเรียน
// ============================================================================

/** อ่านข้อมูลนักเรียนทั้งหมด (มี Cache + เติม QR_ID/คะแนนอัตโนมัติ) */
function getStudents_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('students_all');
  if (cached) return { success: true, students: JSON.parse(cached), cached: true };

  const students = readStudentsRaw_();
  cache.put('students_all', JSON.stringify(students), CACHE_STUDENTS_SEC);
  return { success: true, students: students };
}

/** อ่านข้อมูลดิบจากชีต + เติมค่าเริ่มต้น (คะแนน 100 / สร้าง QR_ID) ถ้ายังไม่มี */
function readStudentsRaw_() {
  const sheet = getSheet_(MAIN_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const range = sheet.getRange(2, 1, lastRow - 1, 5);
  const values = range.getValues();
  let needWriteBack = false;

  const students = values.map(function (row, i) {
    let score = row[COL.SCORE - 1];
    let qr = row[COL.QR - 1];

    // คะแนนยังไม่มี -> กำหนดเป็นค่าเริ่มต้น 100
    if (score === '' || score === null || isNaN(score)) {
      score = DEFAULT_SCORE;
      values[i][COL.SCORE - 1] = score;
      needWriteBack = true;
    }
    score = clampScore_(Number(score));

    // QR_ID ยังไม่มี -> สร้าง UUID ใหม่
    if (!qr) {
      qr = Utilities.getUuid();
      values[i][COL.QR - 1] = qr;
      needWriteBack = true;
    }

    return {
      no: row[COL.NO - 1],
      studentId: String(row[COL.SID - 1]).trim(),
      name: String(row[COL.NAME - 1]).trim(),
      score: score,
      qrId: String(qr),
      maxScore: MAX_SCORE
    };
  });

  // เขียนค่าที่เติมกลับลงชีต (ทำครั้งเดียวแบบ batch)
  if (needWriteBack) range.setValues(values);

  return students;
}

/** ค้นหานักเรียน 1 คน ด้วย studentId หรือ qrId */
function getStudent_(id) {
  if (!id) return { success: false, error: 'missing_id' };
  const key = String(id).trim();
  const students = readStudentsRaw_();
  const ranked = withRank_(students);

  const found = ranked.find(function (s) {
    return s.studentId === key || s.qrId === key;
  });
  if (!found) return { success: false, error: 'not_found' };

  found.history = getHistory_(found.studentId, 20).history || [];
  return { success: true, student: found };
}

// ============================================================================
//  LEADERBOARD / DASHBOARD
// ============================================================================

/** จัดอันดับคะแนน (มากไปน้อย, คะแนนเท่ากันเรียงตามเลขที่) */
function getLeaderboard_() {
  const ranked = withRank_(readStudentsRaw_());
  return { success: true, leaderboard: ranked };
}

/** สถิติภาพรวมสำหรับ Dashboard */
function getDashboard_() {
  const students = readStudentsRaw_();
  const ranked = withRank_(students);
  const n = students.length;

  const scores = students.map(function (s) { return s.score; });
  const sum = scores.reduce(function (a, b) { return a + b; }, 0);
  const avg = n ? Math.round((sum / n) * 100) / 100 : 0;
  const max = n ? Math.max.apply(null, scores) : 0;
  const min = n ? Math.min.apply(null, scores) : 0;

  // การกระจายคะแนนเป็นช่วง ๆ (สำหรับกราฟ)
  const buckets = ['0-20', '21-40', '41-60', '61-80', '81-100'];
  const dist = [0, 0, 0, 0, 0];
  scores.forEach(function (s) {
    if (s <= 20) dist[0]++;
    else if (s <= 40) dist[1]++;
    else if (s <= 60) dist[2]++;
    else if (s <= 80) dist[3]++;
    else dist[4]++;
  });

  return {
    success: true,
    stats: { total: n, average: avg, highest: max, lowest: min },
    distribution: { labels: buckets, data: dist },
    top5: ranked.slice(0, 5),
    bottom5: ranked.slice().sort(function (a, b) { return a.score - b.score; }).slice(0, 5),
    recent: getHistory_(null, 10).history || []
  };
}

// ============================================================================
//  UPDATE SCORE - เพิ่ม/ลดคะแนน (ต้องมี Token)
// ============================================================================

function updateScore_(body) {
  const auth = validateToken_(body.token);
  if (!auth) return { success: false, error: 'unauthorized' };

  const sid = String(body.studentId || '').trim();
  const change = Number(body.change);
  const remark = sanitize_(body.remark);
  const teacher = sanitize_(body.teacher) || auth.user || ADMIN_USERNAME;
  const device = sanitize_(body.device) || 'Unknown';

  // ตรวจสอบข้อมูลนำเข้า
  if (!sid) return { success: false, error: 'missing_student' };
  if (isNaN(change) || change === 0) return { success: false, error: 'invalid_change' };
  if (!remark) return { success: false, error: 'missing_remark' };

  // ล็อกเพื่อป้องกันการเขียนชนกัน (race condition)
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_(MAIN_SHEET);
    const lastRow = sheet.getLastRow();
    const ids = sheet.getRange(2, COL.SID, lastRow - 1, 1).getValues();

    let rowIndex = -1;
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === sid) { rowIndex = i + 2; break; }
    }
    if (rowIndex === -1) return { success: false, error: 'not_found' };

    const nameCell = sheet.getRange(rowIndex, COL.NAME).getValue();
    const oldScore = clampScore_(Number(sheet.getRange(rowIndex, COL.SCORE).getValue()) || 0);
    const newScore = clampScore_(oldScore + change);
    const realChange = newScore - oldScore; // ผลต่างจริงหลัง clamp

    sheet.getRange(rowIndex, COL.SCORE).setValue(newScore);

    // บันทึกประวัติ
    appendHistory_({
      studentId: sid,
      studentName: String(nameCell),
      oldScore: oldScore,
      change: realChange,
      newScore: newScore,
      remark: remark,
      teacher: teacher,
      device: device
    });

    // ล้าง Cache รายชื่อ เพื่อให้ดึงข้อมูลใหม่
    CacheService.getScriptCache().remove('students_all');

    return {
      success: true,
      studentId: sid,
      studentName: String(nameCell),
      oldScore: oldScore,
      change: realChange,
      newScore: newScore
    };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
//  HISTORY - ประวัติการแก้ไขคะแนน
// ============================================================================

/** เพิ่มแถวประวัติ 1 รายการ */
function appendHistory_(h) {
  const sheet = getSheet_(HISTORY_SHEET);
  sheet.appendRow([
    formatDate_(new Date()),
    h.studentId,
    h.studentName,
    h.oldScore,
    h.change,
    h.newScore,
    h.remark,
    h.teacher,
    h.device
  ]);
}

/** อ่านประวัติ (ทั้งหมด หรือเฉพาะ studentId) เรียงล่าสุดก่อน */
function getHistory_(studentId, limit) {
  const sheet = getSheet_(HISTORY_SHEET);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: true, history: [] };

  const values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  let rows = values.map(function (r) {
    return {
      // ถ้าชีตแปลงเป็น Date object ให้จัดรูปแบบกลับเป็น dd/MM/yyyy HH:mm:ss
      timestamp: (r[0] instanceof Date) ? formatDate_(r[0]) : r[0],
      studentId: String(r[1]).trim(),
      studentName: r[2],
      oldScore: r[3],
      change: r[4],
      newScore: r[5],
      remark: r[6],
      teacher: r[7],
      device: r[8]
    };
  });

  if (studentId) {
    const key = String(studentId).trim();
    rows = rows.filter(function (r) { return r.studentId === key; });
  }

  rows.reverse(); // ล่าสุดก่อน
  const lim = limit ? parseInt(limit, 10) : 0;
  if (lim > 0) rows = rows.slice(0, lim);

  return { success: true, history: rows };
}

// ============================================================================
//  RANDOM - สุ่มนักเรียน
// ============================================================================

function getRandom_() {
  const students = readStudentsRaw_();
  if (!students.length) return { success: false, error: 'no_students' };
  const idx = Math.floor(Math.random() * students.length);
  return { success: true, student: withRank_(students).filter(function (s) {
    return s.studentId === students[idx].studentId;
  })[0] };
}

// ============================================================================
//  HELPERS - ฟังก์ชันช่วยเหลือ
// ============================================================================

/** เพิ่มฟิลด์อันดับ (rank) ให้แต่ละนักเรียน */
function withRank_(students) {
  const sorted = students.slice().sort(function (a, b) {
    if (b.score !== a.score) return b.score - a.score;     // คะแนนมากก่อน
    return Number(a.no) - Number(b.no);                    // เท่ากันเรียงตามเลขที่
  });
  sorted.forEach(function (s, i) { s.rank = i + 1; });
  return sorted;
}

/** บีบคะแนนให้อยู่ในช่วง 0 - 100 */
function clampScore_(score) {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(score)));
}

/** ดึง Sheet ตามชื่อ (สร้างให้ถ้ายังไม่มี) */
function getSheet_(name) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

/** แปลงข้อความให้ปลอดภัย (กันสคริปต์ + ตัดความยาว) */
function sanitize_(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[<>]/g, '').trim().slice(0, 200);
}

/** จัดรูปแบบเวลา dd/MM/yyyy HH:mm:ss */
function formatDate_(d) {
  return Utilities.formatDate(d, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss');
}

function now_() { return formatDate_(new Date()); }

/**
 * จำกัดอัตราการเรียก (Rate Limiting) แบบ fixed-window ราย 1 นาที
 * - ใช้ "bucket รายนาที" เป็นส่วนหนึ่งของ key -> key เปลี่ยนเองทุกนาที
 *   จึงรีเซ็ตอัตโนมัติ ไม่สะสมข้ามนาที (แก้บั๊กตัวนับค้างจนสแกน/ให้คะแนนไม่ได้)
 * - แยกโควต้าตามผู้เรียกแต่ละราย (token ของแอดมิน) และแยกตาม action
 *   ผู้ดูแลที่ล็อกอินจึงไม่ไปแย่งโควต้ากับการค้นหาสาธารณะหน้าเว็บ
 */
function checkRateLimit_(e, action, token) {
  try {
    const cache = CacheService.getScriptCache();
    const minuteBucket = Math.floor(Date.now() / 60000);          // เปลี่ยนทุก 60 วินาที
    const who = token ? ('t' + String(token).slice(0, 12)) : 'public';
    const act = action || (e && e.parameter && e.parameter.action) || 'post';
    const key = 'rl_' + who + '_' + act + '_' + minuteBucket;
    const count = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(count), 120);                           // พอครอบคลุมนาทีปัจจุบัน แล้วหมดอายุเอง
    return count <= RATE_LIMIT_MAX;
  } catch (err) {
    return true; // หากเกิดข้อผิดพลาด ไม่บล็อกผู้ใช้
  }
}

/** ตอบกลับเป็น JSON */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
