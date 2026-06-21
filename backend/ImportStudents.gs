/**
 * ============================================================================
 *  สคริปต์นำเข้ารายชื่อนักเรียน 35 คน + ตั้งค่าชีตอัตโนมัติ
 * ----------------------------------------------------------------------------
 *  วิธีใช้:
 *   1) แก้รายชื่อในตัวแปร STUDENT_LIST ด้านล่างให้เป็นข้อมูลจริงของคุณ
 *   2) ในเมนู Apps Script เลือกฟังก์ชัน setupSheets แล้วกด Run (สร้างหัวตาราง)
 *   3) เลือกฟังก์ชัน importStudents แล้วกด Run (ใส่ข้อมูลนักเรียน + คะแนน 100)
 *
 *  หมายเหตุ: ค่าคงที่ต่าง ๆ (SPREADSHEET_ID, ชื่อชีต ฯลฯ) ใช้ร่วมกับ Code.gs
 * ============================================================================
 */

// รายชื่อนักเรียน ม.1/10 (35 คน)
// รูปแบบ: [เลขที่, รหัสนักเรียน, 'คำนำหน้า ชื่อ นามสกุล']
const STUDENT_LIST = [
  [1,  '29637', 'ด.ช. จิตติพัฒน์ ดวงแก้ว'],
  [2,  '29638', 'ด.ช. ฐิติพงศ์ เล็กประยูร'],
  [3,  '29639', 'ด.ช. ณชพัฒน์ ถมยาแก้ว'],
  [4,  '29640', 'ด.ช. ณรัณ บัวทอง'],
  [5,  '29641', 'ด.ช. ณัฐวัตร สัมฤทธิ์'],
  [6,  '29642', 'ด.ช. ทรัพยสิทธิ บุปผาดี'],
  [7,  '29643', 'ด.ช. ธนดล งามเกลี้ยง'],
  [8,  '29644', 'ด.ช. ธนภัทร สร้อยอำภา'],
  [9,  '29645', 'ด.ช. ธนวิชญ์ อิสริยานุพงศ์'],
  [10, '29646', 'ด.ช. ธนวุฒิ โพธ์ทอง'],
  [11, '29647', 'ด.ช. ปัณณทัต เครือเพ่ง'],
  [12, '29648', 'ด.ช. พชร สมัครสมาน'],
  [13, '29649', 'ด.ช. พีรกฤต ทับทิมทอง'],
  [14, '29650', 'ด.ช. พุทธชาด โฉมยงศ์'],
  [15, '29651', 'ด.ช. ภูมิพัฒน์ ศรีไตรภพ'],
  [16, '29652', 'ด.ช. รชต แข็งขัน'],
  [17, '29653', 'ด.ช. ลชานนท์ บัวเงิน'],
  [18, '29654', 'ด.ช. อภิวัฒน์ รูปโฉม'],
  [19, '29655', 'ด.ญ. กัญญาพร วชิรปัทมา'],
  [20, '29656', 'ด.ญ. จิดาภา สว่างจันทร์'],
  [21, '29657', 'ด.ญ. จิราภา ก๋ำนารายณ์'],
  [22, '29658', 'ด.ญ. ฐิติรัตน์ บุญสุวรรณ'],
  [23, '29659', 'ด.ญ. ณัชชา จือประเสริฐ'],
  [24, '29660', 'ด.ญ. ธนพร รัตนชื่นอาภา'],
  [25, '29661', 'ด.ญ. ธมน วุ้นประเสริฐ'],
  [26, '29662', 'ด.ญ. พรธิตา ทองอ่อน'],
  [27, '29663', 'ด.ญ. พัฒน์นรี สุรัตน์เรืองชัย'],
  [28, '29664', 'ด.ญ. พิชญ์สุดา เพชรดี'],
  [29, '29665', 'ด.ญ. มิ่งกมล ใจหาญ'],
  [30, '29666', 'ด.ญ. รินรดา อ่อนระยับ'],
  [31, '29667', 'ด.ญ. ลัลน์ลลิต คิดประเสริฐ'],
  [32, '29668', 'ด.ญ. วรรณพร จันทร์เปล่ง'],
  [33, '29669', 'ด.ญ. วรารัตน์ แก้วประดิษฐ์'],
  [34, '29670', 'ด.ญ. สวิตตา ไฝเครือ'],
  [35, '29671', 'ด.ญ. อุรัสยา เคนซุ่ย']
];

/**
 * สร้างหัวตาราง (Header) ของชีต Sheet1 และ History
 * รันฟังก์ชันนี้ก่อน importStudents
 */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // ----- Sheet1: ข้อมูลนักเรียน -----
  let main = ss.getSheetByName(MAIN_SHEET);
  if (!main) main = ss.insertSheet(MAIN_SHEET);
  main.clear();
  main.getRange(1, 1, 1, 5)
    .setValues([['เลขที่', 'รหัสนักเรียน', 'ชื่อ-สกุล', 'คะแนน', 'QR_ID']])
    .setFontWeight('bold')
    .setBackground('#1e40af')
    .setFontColor('#ffffff');
  main.setFrozenRows(1);
  main.setColumnWidth(3, 220);
  main.setColumnWidth(5, 280);

  // ----- History: ประวัติการแก้ไขคะแนน -----
  let hist = ss.getSheetByName(HISTORY_SHEET);
  if (!hist) hist = ss.insertSheet(HISTORY_SHEET);
  hist.clear();
  hist.getRange(1, 1, 1, 9)
    .setValues([['Timestamp', 'StudentID', 'StudentName', 'OldScore', 'ChangeScore', 'NewScore', 'Remark', 'Teacher', 'Device']])
    .setFontWeight('bold')
    .setBackground('#0f766e')
    .setFontColor('#ffffff');
  hist.setFrozenRows(1);

  SpreadsheetApp.getActiveSpreadsheet().toast('สร้างชีตเรียบร้อยแล้ว ✅', 'Setup', 5);
  Logger.log('setupSheets เสร็จสิ้น');
}

/**
 * นำเข้ารายชื่อนักเรียน + กำหนดคะแนนเริ่มต้น 100 + สร้าง QR_ID อัตโนมัติ
 */
function importStudents() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let main = ss.getSheetByName(MAIN_SHEET);
  if (!main) { setupSheets(); main = ss.getSheetByName(MAIN_SHEET); }

  // ลบข้อมูลเก่า (เก็บหัวตารางไว้)
  const lastRow = main.getLastRow();
  if (lastRow > 1) main.getRange(2, 1, lastRow - 1, 5).clearContent();

  // เตรียมข้อมูล: เติมคะแนน 100 + QR_ID (UUID) ให้ทุกคน
  const rows = STUDENT_LIST.map(function (s) {
    return [s[0], s[1], s[2], DEFAULT_SCORE, Utilities.getUuid()];
  });

  main.getRange(2, 1, rows.length, 5).setValues(rows);

  // ล้างแคชเพื่อให้ API ดึงข้อมูลใหม่
  CacheService.getScriptCache().remove('students_all');

  SpreadsheetApp.getActiveSpreadsheet().toast('นำเข้านักเรียน ' + rows.length + ' คน เรียบร้อย ✅', 'Import', 5);
  Logger.log('นำเข้านักเรียน ' + rows.length + ' คน คะแนนเริ่มต้น ' + DEFAULT_SCORE);
}

/**
 * (ทางเลือก) รันทั้งหมดในขั้นตอนเดียว
 */
function setupAndImport() {
  setupSheets();
  importStudents();
}
