function generateQrCodeDocumentWithPlaceholders() {
  const templateId = '1jZ15GWOMbiBN8FtLHZbydo38mVNi1TRsQ-vmi9W6YHM'; // Template file ID
  const folderId = '1O4ccFFuBqo8hyYtkeRe9MCHaPFa3j7b7'; // Destination folder ID
  const sheetName = 'Qr-code';
  const urlCell = 'D1'; // Cell to update with the final document link

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();

  const tableNames = sheet.getRange(3, 1, lastRow - 2, 1).getValues().flat();
  const qrUrls = sheet.getRange(3, 2, lastRow - 2, 1).getValues().flat();

  // Create a copy of the template document
  const templateFile = DriveApp.getFileById(templateId);
  const finalFile = templateFile.makeCopy('Generated QR Code Document');
  const finalDoc = DocumentApp.openById(finalFile.getId());

  for (let i = 0; i < tableNames.length; i++) {
    if (tableNames[i] && qrUrls[i]) {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qrUrls[i])}`;
      const qrImageBlob = UrlFetchApp.fetch(qrCodeUrl).getBlob();

      // Replace placeholders in the copy
      const body = finalDoc.getBody();
      body.replaceText('{{tafelnr}}', tableNames[i]);

      const qrReplacementSuccess = replaceTextToImage(body, '{{qrcode}}', qrImageBlob);
      if (!qrReplacementSuccess) {
        Logger.log(`Placeholder {{qrcode}} not found for table: ${tableNames[i]}`);
        continue; // Skip to the next iteration if placeholder not found
      }

      // Append a page break after each table
      if (i < tableNames.length - 1) {
        body.appendPageBreak();
      }
    }
  }

  // Save and close the final document
  finalDoc.saveAndClose();

  // Move the generated document to the specified folder
  const folder = DriveApp.getFolderById(folderId);
  folder.addFile(finalFile);
  DriveApp.getRootFolder().removeFile(finalFile); // Remove the file from the root folder

  // Update the spreadsheet with the document's URL
  const finalUrl = finalFile.getUrl();
  const formula = `=HYPERLINK("${finalUrl}", "Download Final Document")`;
  sheet.getRange(urlCell).setFormula(formula);

  Logger.log(`Final document generated and moved to the folder: ${finalUrl}`);
}

// Helper function to replace text with an image
function replaceTextToImage(body, placeholder, imageBlob) {
  const searchResult = body.findText(placeholder);
  if (!searchResult) {
    return false; // Placeholder not found
  }
  const element = searchResult.getElement();
  const text = element.asText();
  const offset = searchResult.getStartOffset();
  text.deleteText(offset, offset + placeholder.length - 1);

  const parent = text.getParent();
  parent.asParagraph().insertInlineImage(0, imageBlob);
  return true;
}
