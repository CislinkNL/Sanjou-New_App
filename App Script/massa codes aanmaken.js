// Constants

//批量生成二维码的样本文件id,很简单的{{tafelnr}} 和 {{pincode}} - pincode merge template - Asian Boulervard - Tilburg
const DOC_TEMPLATE_ID = "1o8EdBveaSfm7uII4scSwRQ1HQhpaHY__CrExwZ3DOWg"; 

//最终合成每张台的文档，可以批量打印的文档 - pincode massa print file - Asian Boulervart Tilburg
const DOC_FINAL_ID = "1Lk-zX30Ct4ztQMCrYaCj-WvT_Bt0F-tdKh6p2Ufa3p8"; 

//menukaar的表单的id
const SHEET_ID = "1F6MFkhfB8oVIGScddV6mCQw2SGHAvOs4emCQ6XeopK8";
const SHEET_NAME = "Qr-code";
const URL_CELL = "L1"; //链接所在格子

// Main function
function makePincodeDoc() {
  try {
    var docTemplate = DocumentApp.openById(DOC_TEMPLATE_ID);
    var docFinal = DocumentApp.openById(DOC_FINAL_ID);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    
    var data = sheet.getRange(3, 1, sheet.getLastRow() - 2, 15).getValues();
    
    docFinal.getBody().clear();
    data.forEach(function(row) {
      createMailMerge(row[0], row[14], docTemplate.getBody().getParagraphs(), docFinal);
    });
    
    // Assuming updateSpreadsheetWithUrl() correctly updates the URL
    updateSpreadsheetWithUrl();
    
    // Return the URL of the final document
    return DocumentApp.openById(DOC_FINAL_ID).getUrl();
  } catch (error) {
    Logger.log("An error occurred: " + error);
    return ""; // Return an empty string in case of error
  }
}

// Function to replace placeholders in the template with actual data
function createMailMerge(tafelnr, qrcode, templateParagraphs, docFinal) {
  Logger.log(qrcode)
  templateParagraphs.forEach(function(p) {
    docFinal.getBody().appendParagraph(
      p.copy().replaceText("{{tafelnr}}", tafelnr)
    );
    
  });
  replaceTextToImage(docFinal.getBody(), "{{qrcode}}", qrcode);
  docFinal.getBody().appendPageBreak();
  updateSpreadsheetWithUrl();
}

// Function to update spreadsheet with document URL
function updateSpreadsheetWithUrl() {
  const urlFinal = DocumentApp.openById(DOC_FINAL_ID).getUrl();
  const urlFormula = '=hyperlink("' + urlFinal + '"; "download")';
  SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME).getRange(URL_CELL).setFormula(urlFormula);
}


// Function to replace text with image in a document
function replaceTextToImage(body, searchText, imageFileId) {
  var image = DriveApp.getFileById(imageFileId).getBlob();
  var next = body.findText(searchText);
  if (!next) return;
  var r = next.getElement();
  r.asText().setText('');
  r.getParent().asParagraph().insertInlineImage(0, image).setWidth(380).setHeight(380);
  return;
}

