
//App Script
const ss = SpreadsheetApp.getActiveSpreadsheet();
const restNaam = ss.getSheetByName('teksten').getRange('B38').getDisplayValue();
const restUrlName = restNaam.replace(/\s+/g, "");
const sheet = ss.getSheetByName("Qr-code");
const IpAdres = ss.getSheetByName("teksten").getRange("A55").getDisplayValue();
const pythonAuth = "https://" + IpAdres + "/authenticate";
// Get the values in column A
const dataRange = sheet.getRange("A:A");
const lastRow = dataRange.getLastRow();
const pinCode = generateUniquePin();
const BeheerWachtwoord = ss.getSheetByName("teksten").getRange("A68").getValue();
const folderId = '1moKhqMFWqVUyDAmCLLyKjt7YWs1Am_3k';
const allowedTime = sheet.getRange('B15').getValue()


function getPrinterIp() {
  const printerIp = ss.getSheetByName('teksten').getRange('A57').getDisplayValue();
  return printerIp;

}

function doGet(e) {
  let downloadUrl = ""; // Initialize an empty string for the download URL

  if (e.parameter['page'] == 'make') {
    downloadUrl = makePincodeDoc(); // Call the modified makePincodeDoc function to get the URL
  }

  if (e.parameter['page'] == 'updateMenu') {
    // Call the function to update the menu
    insertMenukaartData();

    // Generate the HTML output with the message
    const message = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              margin-top: 50px;
            }
            h1 {
              color: #4CAF50;
              font-size: 2em;
            }
          </style>
        </head>
        <body>
          <h1>Menukaart is bijgewerkt!</h1>
        </body>
      </html>
    `;

    // Return the styled HTML message
    return HtmlService.createHtmlOutput(message);
  }
  ///////////////////////////////////////////
  // Translations update
  ////////////////////////////////////////////
  if (e.parameter['page'] == 'updateTrans') {
    // Call the function to update the menu
    insertMenukaartData();

    // Generate the HTML output with the message
    const message = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              margin-top: 50px;
            }
            h1 {
              color: #4CAF50;
              font-size: 2em;
            }
          </style>
        </head>
        <body>
          <h1>Vertalingen zijn bijgewerkt!</h1>
        </body>
      </html>
    `;

    // Return the styled HTML message
    return HtmlService.createHtmlOutput(message);
  }

  if (e.parameter['page'] == 'forceRefresh') {
    // Call the function to update the menu
    updateRefreshKey();

    // Generate the HTML output with the message
    const message = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              margin-top: 50px;
            }
            h1 {
              color: #4CAF50;
              font-size: 2em;
            }
          </style>
        </head>
        <body>
          <h1>Klant App wordt verversd.</h1>
        </body>
      </html>
    `;

    // Return the styled HTML message
    return HtmlService.createHtmlOutput(message);
  }
  if (e.parameter['page'] == 'personeel') {
    const html = HtmlService.createTemplateFromFile('personeel').evaluate()
      .setTitle('Sushi Boulevard - Tafel beheer')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no');
    return html;
  }
  if (e.parameter['page'] === 'update' && e.parameter['id']) {
    // Call the function to handle the update
    return updateVersion(e.parameter['id']); // Pass the id parameter to the function
  }
  if (e.parameter['page'] == 'personeel2') {
    const html = HtmlService.createTemplateFromFile('personeel2').evaluate()
      .setTitle('Asuka - Personeel')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no');
    return html;
  }

  // Embed the download URL in the HTML content
  var htmlContent = `
    <html>
      <head>
        <title>Mobiel bestellen Restaurant</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no">
        <meta name="mobile-web-app-capable" content="yes">
        <style>
          /* Your existing CSS */
        </style>
      </head>
      <body>
        <div class="container">
          <h3 id="warning-message">Document is gereed voor afdrukken. Klik op de onderstaande link om te downloaden:</h3>
          ${downloadUrl ? `<a href="${downloadUrl}" target="_blank" style="display: block; text-align: center; background-color: #007bff; color: white; padding: 10px; border-radius: 5px; text-decoration: none; margin-top: 20px;">Download Document</a>
          <br><i>De download link kun je terug vinden in google sheet</i>` : ""}
        </div>
      </body>
    </html>
  `;

  var Warning = HtmlService.createHtmlOutput(htmlContent)
    .setTitle('Mobiel bestellen Restaurant')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no')
    .addMetaTag('mobile-web-app-capable', 'content=yes');

  return Warning;
}



function generateUniquePin() {
  // Generate a PIN code between 1200 and 9999
  var pinCode = Math.floor(Math.random() * (9999 - 1200 + 1)) + 1200;
  return pinCode;
}


// Function to set PIN code automatically
function pinAutoMaken() {
  var spreadsheet = SpreadsheetApp.getActive();
  var sheetName = spreadsheet.getSheetName();
  var rowNum = spreadsheet.getActiveCell().getRow();
  var colNum = spreadsheet.getActiveCell().getColumn();
  var status = spreadsheet.getRange('E' + rowNum).getValue();
  var tableUrl = spreadsheet.getRange('Q' + rowNum).getValue();

  if (status == 'open' && sheetName == 'Qr-code' && rowNum > 2 && colNum == 5) {
    var pinCode = generateUniquePin();
    spreadsheet.getRange('N' + rowNum).setValue('even geduld...').setBackground('red').setFontSize(12);
    spreadsheet.getRange('J' + rowNum).setValue(pinCode);
    var tafelPin = parseInt(spreadsheet.getRange('J' + rowNum).getValue());
    spreadsheet.getRange('J' + rowNum).setValue(tafelPin);
    var executionFlag = spreadsheet.getRange('R' + rowNum).getValue(); // Assuming column Q is used for the execution flag
    var tafelPinCopy = parseInt(spreadsheet.getRange('P' + rowNum).setValue(tafelPin).getValue());
    if (!executionFlag) { // Check if the function has not yet been run for this row
      spreadsheet.getRange('R' + rowNum).setValue('In Progress'); // Set the flag before execution


      if (tafelPinCopy == tafelPin) {
        callReset(tableUrl, rowNum);
        createDynamicQrcode(rowNum);

        spreadsheet.getRange('R' + rowNum).clearContent(); // Optionally clear or update the flag after execution
      }
    }
  } else {
    return;
  }
}

function autoSluitenAll() {


  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Qr-code");
  var range = sheet.getRange(3, 5, lastRow - 2);

  range.setValue("afgesloten");


}


function autoOpenAll() {


  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Qr-code");

  var range = sheet.getRange(3, 5, lastRow - 2);

  range.setValue("open");
  // autoChangeAll();



  SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("Qr-code")
    .getRange("M1")
    .setValue("alle tafels geopend").setFontColor("green");

}




function autoChangeAll() {

  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName("Qr-code");
  var Bvals = sheet.getRange("A1:A").getValues();
  var lastRow = Bvals.filter(String).length;
  var clearPins = sheet.getRange(3, 10, lastRow - 2).clear();

  var formula = '=unique(randbetween(100; 9999 * sign(sequence(10000))); 1;1)';
  sheet.getRange(3, 10, lastRow - 2).setFormula(formula);
  var pins = sheet.getRange(3, 10, lastRow - 2).getValues();
  sheet.getRange(3, 10, lastRow - 2).setValues(pins).setFontSize(24).setFontWeight("bold").setVerticalAlignment("middle");



}


function clearRowsContent() {

  var sheetId = SpreadsheetApp.getActiveSpreadsheet().getId();



  var SS = SpreadsheetApp.openById(sheetId);

  var SHEET = SS.getSheetByName("overzicht");

  var RANGE = SHEET.getDataRange();

  SHEET.getRange(2, 1, RANGE.getLastRow(), RANGE.getLastColumn()).clearContent();


}


function emptyTrashBin() {

  try {
    Drive.Files.emptyTrash(); // This function clears all items in the trash.
    Logger.log("Trash emptied successfully.");
  } catch (error) {
    Logger.log("Failed to empty trash: " + error.toString());
  }

}



function aadNewTrigger() {
  ScriptApp.newTrigger("clearRowsContent")
    .timeBased()
    .atHour(1)
    .nearMinute(30)
    .everyDays(1)
    .create();

  ScriptApp.newTrigger("autoOpenAll")
    .timeBased()
    .atHour(13)
    .nearMinute(45)
    .everyDays(1)
    .create();

  ScriptApp.newTrigger("autoSluitenAll")
    .timeBased()
    .atHour(1)
    .nearMinute(10)
    .everyDays(1)
    .create();

}


// Google Apps Script Function
function getSheetData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Qr-code');
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(`A3:M${lastRow}`).getValues();


  // Mapping the data to key-value pairs (example)
  return data.map(row => ({
    Tafel: row[0],
    Persons: row[1],
    Status: row[4], // Assuming column E (status) is in the 5th position
    Pincode: row[9],
    URL: row[12]

  }));

}


const FIREBASE_URL = "https://cislink-default-rtdb.europe-west1.firebasedatabase.app";
const FIREBASE_SECRET = "LXJknPDcIrdVSwuNX9jx2MrtflVnHSCoYR4u0dOl";
function insertMenukaartData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('menu');
  const lastRow = sheet.getLastRow();
  console.log("Aantal rijen: " + lastRow);

  const data = sheet.getRange(`A2:Z${lastRow}`).getValues();

  const menuData = data.reduce((obj, row) => {
    const menukaart = row[0];
    let hasOptions = row[11]?.toString().toLowerCase() === "yes";
    let options = {};

    if (hasOptions) {
      for (let i = 12; i < row.length; i += 7) { // Fixed: Increment by 7 columns per option
        if (row[i]) {
          let rawOptionName = row[i].toString().replace(/[$#[\]./]/g, "").trim();
          let optionName = rawOptionName.replace(/[$#[\]./]/g, "").trim();

          let choices = {};
          for (let j = 1; j <= 3; j++) { // Process up to 3 choices per option
            let rawChoice = row[i + j * 2 - 1];
            let price = row[i + j * 2];

            if (rawChoice) {
              let choiceName = rawChoice.toString().trim().replace(/[$#[\]./]/g, "");
              // Fixed price parsing to handle 0 correctly
              let priceNum = parseFloat(price);
              choices[choiceName] = isNaN(priceNum) ? 0 : priceNum;
            }
          }

          if (Object.keys(choices).length > 0) {
            options[optionName] = {
              label: `Kies ${rawOptionName}`,
              Keuzes: choices
            };
          }
        }
      }
    }

    let item = {
      sku: menukaart,
      description: row[1],
      price: row[3] ? parseFloat(row[3].toString().replace(/[^\d.,-]/g, '').replace(',', '.')) || 0.00 : 0.00,
      taxRate: row[4],
      image: row[5] ? row[5].toString().trim() : "",
      status: row[6],
      group: row[7],
      allergy: row[8],
      id: row[9],
      sortingNrm: row[10],
      hasOptions: Object.keys(options).length > 0,
      options: options
    };

    obj[menukaart] = item;
    return obj;
  }, {});

  const payload = JSON.stringify(menuData, null, 2);

  const options = {
    method: 'PUT',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(`${FIREBASE_URL}/${restUrlName}/menukaart.json?auth=${FIREBASE_SECRET}`, options);

  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode === 200) {
    console.log(`✅ "Menu data inserted successfully under '${restUrlName}/menukaart'"`);
    console.log("✅ Response Code:", responseCode);
    console.log("✅ Response Body:", responseText);
  } else {
    console.error(`❌ Failed to insert menukaart data: ${responseText}`);
    console.log(`❌ Response Code: ${responseCode}`);
    console.log(`❌ Payload sent:`, payload);
  }
}



function fetchMenukaartDataToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('menu');
  sheet.clearContents();

  const headers = [
    'Menukaart', 'Description', '', 'Price', 'TaxRate', 'Image', 'Status',
    'Group', 'Allergy', 'ID', 'SortingNrm', 'HasOptions',
    'Option1', 'Choice1-1', 'Price1-1', 'Choice1-2', 'Price1-2', 'Choice1-3', 'Price1-3',
    'Option2', 'Choice2-1', 'Price2-1', 'Choice2-2', 'Price2-2', 'Choice2-3', 'Price2-3'
  ];
  sheet.appendRow(headers);

  const url = `${FIREBASE_URL}/${restUrlName}/menukaart.json?auth=${FIREBASE_SECRET}`;
  const response = UrlFetchApp.fetch(url);
  const data = JSON.parse(response.getContentText());

  const rows = [];
  let startRow = 2; // 因为第1行是表头

for (const key in data) {
  const item = data[key];
  const rowNumber = startRow + rows.length;
  const imageFormula = `=IMAGE(F${rowNumber})`;

  const row = [
    item.sku || '',
    item.description || '',
    imageFormula,
    item.price || '',
    item.taxRate || '',
    item.image || '',
    item.status || '',
    item.group || '',
    item.allergy || '',
    item.id || '',
    item.sortingNrm || '',
    item.hasOptions ? 'Yes' : 'No'
  ];

  if (item.hasOptions && item.options) {
    const optionKeys = Object.keys(item.options);
    for (let i = 0; i < optionKeys.length; i++) {
      const opt = item.options[optionKeys[i]];
      row.push(optionKeys[i]);
      const keuzes = opt.Keuzes;
      const choiceKeys = Object.keys(keuzes);
      for (let j = 0; j < 3; j++) {
        const choice = choiceKeys[j];
        if (choice) {
          row.push(choice);
          row.push(keuzes[choice]);
        } else {
          row.push('');
          row.push('');
        }
      }
    }
  }

  // 🔧 补足不足的列
  while (row.length < headers.length) {
    row.push("");
  }

  rows.push(row);
}

  if (rows.length > 0) {
    sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
    console.log(`✅ 导入成功，共写入 ${rows.length} 行`);
  } else {
    console.log("⚠️ 没有可写入的数据");
  }
}


/**
 * 回调入口：POST JSON -> 更新 “Qr-code” 表的 人数(B) 与 pincode(J)
 * 支持三种负载格式：
 * 1) 单条：{ tafel: "T01", persons: 3, pincode: "1234" }
 * 2) 批量数组：[ { tafel:"T01", persons:2, pincode:"1111" }, {...} ]
 * 3) 批量对象：{ "T01": { persons:2, pincode:"1111" }, "T02": { ... } }
 */
function doPost(e) {
  try {
    const body = parseJsonSafe(e && e.postData && e.postData.contents);
    if (!body) return json(400, { ok: false, error: "Empty or invalid JSON" });

    const updates = normalizePayloadToArray(body);
    if (!updates.length) return json(400, { ok: false, error: "No valid updates" });

    const result = upsertTafelPersonsAndPincode(updates);
    return json(200, { ok: true, ...result });
  } catch (err) {
    return json(500, { ok: false, error: String(err) });
  }
}

/**
 * 只更新 “Qr-code” 表：
 * - A列：桌号(tafel)
 * - B列：人数(persons)
 * - J列：pincode
 * 若表内无此桌号，则追加新行（写入 A/B/J，其它列留空）
 * @param {Array<{tafel:string, persons:number, pincode:string}>} updates
 */
function upsertTafelPersonsAndPincode(updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Qr-code');
  if (!sheet) throw new Error("Sheet 'Qr-code' not found.");

  // 读现有桌号索引（从第3行开始，与你现有结构一致）
  const firstRow = 3;
  const lastRow = Math.max(sheet.getLastRow(), firstRow);
  const count = lastRow - firstRow + 1;
  const colA = count > 0 ? sheet.getRange(firstRow, 1, count, 1).getValues() : [];

  // 建立 “桌号 -> 行号” 映射
  const index = new Map();
  colA.forEach((r, i) => {
    const key = normalizeTafel(r[0]);
    if (key) index.set(key, firstRow + i);
  });

  // 预备批量写：对已存在的行集中 setValues；新增的行一次性 append
  const writes = [];       // { row, persons, pincode }
  const appends = [];      // { tafel, persons, pincode }

  updates.forEach(u => {
    const tafel = normalizeTafel(u.tafel);
    const persons = toNumber(u.persons);
    const pincode = String(u.pincode ?? "").trim();

    if (!tafel) return; // 无有效桌号，跳过
    if (index.has(tafel)) {
      const row = index.get(tafel);
      writes.push({ row, persons, pincode });
    } else {
      appends.push({ tafel, persons, pincode });
    }
  });

  // 批量更新已存在的行（B、J 列）
  // Tip: setValues 需要连续区域，这里按行升序分批处理，提高性能
  writes.sort((a, b) => a.row - b.row);
  if (writes.length) {
    // 由于行号可能不连续，逐行写是最稳妥的（行数多时也可做“分段连续块”优化）
    writes.forEach(w => {
      // B列=2, J列=10
      sheet.getRange(w.row, 2).setValue(w.persons);
      sheet.getRange(w.row, 10).setValue(w.pincode);
    });
  }

  // 批量追加新行（按你表的结构，A/B/J 三列写值，其它列留空）
  if (appends.length) {
    appends.forEach(a => {
      const row = sheet.getLastRow() + 1;
      // 若需要从第3行开始，可保障至少有2行标题：
      if (row < 3) sheet.insertRows(1, 2); // 防御；一般不需要
      sheet.getRange(row, 1).setValue(a.tafel);   // A
      sheet.getRange(row, 2).setValue(a.persons); // B
      sheet.getRange(row, 10).setValue(a.pincode);// J
    });
  }

  return {
    updated: writes.length,
    inserted: appends.length,
    total: writes.length + appends.length
  };
}

/* ------------------------- 工具函数 ------------------------- */

function parseJsonSafe(str) {
  try {
    if (!str) return null;
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
}

function json(status, obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
    .setSandboxMode && ContentService.getSandboxMode // 兼容旧环境
    ? ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
    : ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function normalizePayloadToArray(body) {
  // 1) 单条对象
  if (body && typeof body === 'object' && !Array.isArray(body) && ('tafel' in body || 'table' in body)) {
    return [coerceEntry(body)];
  }
  // 2) 批量数组
  if (Array.isArray(body)) {
    return body.map(coerceEntry).filter(Boolean);
  }
  // 3) 批量对象：{ "T01": {persons, pincode}, ... }
  if (body && typeof body === 'object') {
    return Object.keys(body).map(k => {
      const v = body[k] || {};
      return coerceEntry({ tafel: k, persons: v.persons, pincode: v.pincode });
    }).filter(Boolean);
  }
  return [];
}

function coerceEntry(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const tafel = normalizeTafel(obj.tafel || obj.table || obj.TableNameString);
  const persons = toNumber(obj.persons ?? obj.Persons);
  const pincode = String(obj.pincode ?? obj.Pincode ?? "").trim();
  if (!tafel) return null;
  return { tafel, persons, pincode };
}

function normalizeTafel(v) {
  return String(v ?? "").trim();
}

function toNumber(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}



function insertTafelData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Qr-code');
  if (!sheet) throw new Error("Sheet 'Qr-code' not found.");

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) {
    Logger.log("No data rows (lastRow < 3).");
    return;
  }

  const rangeA1 = `A3:S${lastRow}`;
  const data = sheet.getRange(rangeA1).getValues();
  Logger.log("Read range: %s (rows=%s)", rangeA1, data.length);

  // Build payload
  const menuData = {};
  let processed = 0, skipped = 0;

  data.forEach((row, i) => {
    const tafel = String(row[0] || "").trim();   // A 列：台号
    if (!tafel) { skipped++; return; }

    // 时间示例（保持你原有逻辑）
    const startTime = 1;     // TODO: 如果要用当前时间，改为 Date.now()
    const duration  = 15;                // 分钟
    const endTime   = startTime + duration * 60 * 1000;

    menuData[tafel] = {
      Persons:     toNumber(row[1]),                 // B
      Status:      String(row[4] || "").toLowerCase() || "open", // E
      Pincode:     String(row[9]  || ""),            // J
      URL:         String(row[12] || ""),            // M
      TableOrder:  toNumber(row[18]),                // S
      menuType:    "dinner",                         // 新字段
      timer: { duration, startTime, endTime }
    };
    processed++;
  });

  Logger.log("Processed=%s, skipped(blank tafel)=%s", processed, skipped);
  const firstKey = Object.keys(menuData)[0];
  if (!firstKey) {
    Logger.log("No valid rows to write (all tafel empty).");
    return;
  }
  Logger.log("Sample [%s]: %s", firstKey, JSON.stringify(menuData[firstKey], null, 2));

  // ---- PUT 全量写入 -------------------------------------------------------
  const url = `${FIREBASE_URL}/${restUrlName}/tafel.json?auth=${FIREBASE_SECRET}`;
  const payload = JSON.stringify(menuData);
  Logger.log('PUT %s', url);
  Logger.log('Payload has "menuType"? %s', payload.indexOf('"menuType"') !== -1);

  let res = UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/json',
    payload,
    muteHttpExceptions: true
  });

  const putCode = res.getResponseCode();
  const putBody = res.getContentText();
  Logger.log('PUT status=%s', putCode);
  Logger.log('PUT body (first 500 chars): %s', putBody.substring(0, 500));

  if (putCode >= 400) {
    Logger.log('PUT failed, stop. Body: %s', putBody);
    return;
  }

  // 解析返回，确认是否含 menuType；若没有则兜底 PATCH 只更新 menuType
  let needPatch = false;
  try {
    const json = JSON.parse(putBody) || {};
    needPatch = Object.keys(menuData).some(k => !json[k] || typeof json[k].menuType === 'undefined');
  } catch (e) {
    Logger.log('PUT response JSON parse error: %s', e);
    needPatch = true; // 无法解析返回，保险起见做一次 PATCH
  }

  if (needPatch) {
    const patchObj = Object.keys(menuData).reduce((acc, tafel) => {
      acc[`${tafel}/menuType`] = "dinner";
      return acc;
    }, {});
    const patchPayload = JSON.stringify(patchObj);
    Logger.log('PATCH menuType for %s tafels', Object.keys(menuData).length);

    res = UrlFetchApp.fetch(url, {
      method: 'patch',
      contentType: 'application/json',
      payload: patchPayload,
      muteHttpExceptions: true
    });

    const patchCode = res.getResponseCode();
    const patchBody = res.getContentText();
    Logger.log('PATCH status=%s', patchCode);
    Logger.log('PATCH body (first 500 chars): %s', patchBody.substring(0, 500));
  } else {
    Logger.log('menuType present in PUT response; skip PATCH.');
  }
}

function insertTranslationsToFirebase() {
  const sheetName = 'Translations';  // The name of your Google Sheet tab
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    console.error("Sheet not found!");
    return;
  }

  // Get the data range, assuming headers are in the first row
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Create an empty object to hold the translations
  const translations = {};

  // Loop through the data, starting from row 2 to skip headers
  for (let i = 1; i < data.length; i++) {
    let sourceTerm = data[i][0];  // The term in Chinese zh-CN (column A)

    // Sanitize the source term to be a valid Firebase key
    sourceTerm = sanitizeKey(sourceTerm);

    headers.forEach((langCode, index) => {
      if (index > 0 && data[i][index]) {  // Skip the first column (source language 'zh-CN')
        if (!translations[langCode]) translations[langCode] = {};
        translations[langCode][sourceTerm] = data[i][index];  // Use langCode as the key
      }
    });
  }

  // Send the translations to Firebase
  const url = `${FIREBASE_URL}/${restUrlName}/translations.json?auth=${FIREBASE_SECRET}`;
  const options = {
    method: "put",
    contentType: "application/json",
    payload: JSON.stringify(translations)
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    console.log(`Translations was inserted into "${restUrlName}/translations" successfully`)
  } catch (error) {
    console.error("Error uploading to Firebase:", error);
  }
}

function sanitizeKey(key) {
  if (typeof key !== "string") {
    key = String(key); // ✅ Convert non-string values to a string
  }

  return key
    .trim() // Remove leading/trailing spaces
    .replace(/[.#$\[\]\/]/g, "_") // Replace Firebase-restricted characters with underscores
    .replace(/\s+/g, "_") // Replace spaces with underscores for consistency
    .toLowerCase(); // Convert to lowercase for uniformity
}



function updateRefreshKey() {


  // Firebase REST API endpoint
  const firebaseUrl = `${FIREBASE_URL}/${restUrlName}/refresh.json?auth=${FIREBASE_SECRET}`;
  console.log(firebaseUrl)
  try {
    const payload = JSON.stringify(1); // Set refresh key to 1
    const options = {
      method: "PUT", // Use PUT to update the value
      contentType: "application/json",
      payload: payload,
    };

    const response = UrlFetchApp.fetch(firebaseUrl, options);

    // Log the response for debugging purposes
    Logger.log("Firebase response: " + response.getContentText());
  } catch (error) {
    Logger.log("Error updating Firebase refresh key: " + error.message);
  }
}






function updateTableStatus(tableId, status, persons, appPincode) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Qr-code');
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(`A3:A${lastRow}`).getValues();

  const rowIndex = data.findIndex(row => row[0] === tableId);

  // Make sure rowIndex is valid before proceeding
  if (rowIndex !== -1) {
    const currentPincode = sheet.getRange('J' + (rowIndex + 3)).getValue();  // Assuming pincode is in column J
    const tableUrl = sheet.getRange('R' + (rowIndex + 3)).getValue();  // Assuming URL is in column Q

    // Update status only if it's not null
    if (status !== null) {
      sheet.getRange(rowIndex + 3, 5).setValue(status); // Assuming column E (index 5) holds the status

      // Check if the status is 'afgesloten' and the appPincode differs from the current pincode
      if (status.toLowerCase() === 'afgesloten' && appPincode !== currentPincode) {
        sheet.getRange('J' + (rowIndex + 3)).setValue(appPincode);  // Update the pincode
        // createDynamicQrcode(rowIndex + 3, tableUrl);  // Pass the correct sheet row index and URL
      } else if (status.toLowerCase() === 'afgesloten' && appPincode === currentPincode) {
        callReset(tableUrl, rowIndex + 3);  // Assuming callReset needs URL and row index
      }
    }

    // Update number of persons
    if (persons !== '') {
      sheet.getRange(rowIndex + 3, 2).setValue(persons); // Assuming column B (index 2) holds the persons count
    }
  } else {
    console.error('Row index not found for tableId:', tableId);
  }
}








///wijzig de pincode per tafel
// Google Apps Script
function updatePincode(sheetRow, newPincode) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Qr-code');
  const cell = sheet.getRange('J' + sheetRow); // Adjust 'J' if your pincode column is different
  cell.setValue(newPincode);
  // createDynamicQrcode(sheetRow);
}


// function to make qr-code for personeel app
function generateQRCode(webappUrl, tafel) {
  const qrColor = '021886'; // Customize QR code color
  const bgColor = 'FFFFFF'; // Customize background color

  // Construct the URL for the QR code with custom color and background
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(webappUrl)}&color=${encodeURIComponent(qrColor)}&bgcolor=${encodeURIComponent(bgColor)}`;

  return qrCodeUrl;
}


function checkPassword(inputPassword) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('teksten');
  // Explicitly convert the spreadsheet value to a string
  const correctPassword = String(sheet.getRange('A68').getValue());

  // Also ensure the input password is treated as a string
  if (String(inputPassword) === correctPassword) {
    // Password is correct
    return true;
  } else {
    // Password is incorrect
    return false;
  }
}
function checkPasswordPin(inputPassword) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('teksten');
  // Explicitly convert the spreadsheet value to a string
  const correctPassword = String(sheet.getRange('A68').getValue());

  // Also ensure the input password is treated as a string
  if (String(inputPassword) === correctPassword) {
    // Password is correct
    return true;
  } else {
    // Password is incorrect
    return false;
  }
}
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}



function getCurrentIPAddress() {
  var response = UrlFetchApp.fetch('https://ipinfo.io/json');
  var data = response.getContentText();
  var ipInfo = JSON.parse(data);
  ss.getSheetByName("teksten").getRange("A56").setValue(ipInfo.ip)
  return
}

function getNgrokUrl() {
  const ngrokUrl = pythonAuth

  return ngrokUrl;

}

function deleteOrderHistoryFromFirebase() {
  try {
    const sheetName = 'Qr-code';  // The Google Sheet containing table IDs
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    if (!sheet) {
      console.error("Sheet 'Qr-code' not found!");
      return;
    }

    // Get all tafelIds from column A (starting from A4 to the last row)
    const lastRow = sheet.getLastRow();
    if (lastRow < 4) {
      console.warn("No table IDs found in 'Qr-code' sheet.");
      return;
    }

    const tableIDs = sheet.getRange(`A3:A${lastRow}`).getValues().flat().filter(Boolean);
    if (tableIDs.length === 0) {
      console.warn("No valid table IDs found.");
      return;
    }

    // **Step 1: Fetch current data from Firebase first to prevent unnecessary updates**
    const fetchUrl = `${FIREBASE_URL}/${restUrlName}/tafel.json?auth=${FIREBASE_SECRET}`;
    const fetchResponse = UrlFetchApp.fetch(fetchUrl, { method: "GET" });
    const existingData = JSON.parse(fetchResponse.getContentText());

    // Object to store Firebase updates
    const updates = {};

    // **Step 2: Construct updates only if changes are needed**
    tableIDs.forEach(tafelId => {
      const tafelData = existingData && existingData[tafelId] ? existingData[tafelId].orders : {};
      if (tafelData) {
        if (tafelData.history !== undefined) {
          updates[`tafel/${tafelId}/orders/history`] = null;  // Deletes the history
        }
        if (tafelData.menu !== 0) {
          updates[`tafel/${tafelId}/orders/menu`] = 0;  // Resets menu count to 0
        }
        if (tafelData.orderNumbers !== 1) {
          updates[`tafel/${tafelId}/orders/orderNumbers`] = 1;  // Resets orderNumbers to 1
        }
      }
    });

    // **Step 3: Only send update if there are actual changes**
    if (Object.keys(updates).length === 0) {
      console.log("No changes needed. Skipping Firebase update.");
      return;
    }

    // Firebase API URL (matching the translations example)
    const url = `${FIREBASE_URL}/${restUrlName}.json?auth=${FIREBASE_SECRET}`;
    const options = {
      method: "PATCH",
      contentType: "application/json",
      payload: JSON.stringify(updates)
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText(); // Capture Firebase response

    if (responseCode === 200) {
      console.log("Order history deleted successfully from Firebase.");

    } else {
      console.error(`Firebase API Error: Response Code ${responseCode}`);
      console.error(`Response Text: ${responseText}`);
      SpreadsheetApp.getUi().alert(`Fout bij verwijderen van bestelgeschiedenis!\nError: ${responseText}`);
    }
  } catch (error) {
    console.error("Error deleting order history from Firebase:", error);
    SpreadsheetApp.getUi().alert("Er is een fout opgetreden. Bekijk de log voor details.");
  }
}