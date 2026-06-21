/* ============================================================================
 *  config.js - การตั้งค่าหลักของระบบ (Frontend)
 * ----------------------------------------------------------------------------
 *  ⚠️ สำคัญ: หลัง Deploy Google Apps Script แล้ว
 *  ให้นำ URL ของ Web App มาวางแทนค่าด้านล่างนี้
 *  ตัวอย่าง: https://script.google.com/macros/s/AKfycb..../exec
 * ========================================================================== */

const CONFIG = {
  // 🔧 URL Web App ของ Google Apps Script (Deploy แล้ว)
  API_URL: 'https://script.google.com/macros/s/AKfycbzNIfIlb0HK5RSIvF1olohJqHOyzXAJ21NdLEKtZRJ63LIdFsN2DvnwzvLaxBNwPNnP/exec',

  // ชื่อโรงเรียน (แสดงบนบัตรนักเรียน/หัวเว็บ)
  SCHOOL_NAME: 'โรงเรียนของเรา',
  CLASS_NAME: 'ชั้นมัธยมศึกษาปีที่ 1/10',

  MAX_SCORE: 100,        // คะแนนเต็ม
  TOKEN_KEY: 'sms_token',      // คีย์เก็บ Token ใน LocalStorage
  TOKEN_EXP_KEY: 'sms_token_exp',
  THEME_KEY: 'sms_theme'       // คีย์เก็บธีม (light/dark)
};
