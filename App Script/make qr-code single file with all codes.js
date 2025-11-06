/**
 * Generates a single PDF file containing all QR codes from the spreadsheet data.
 */
function generateQrCodeDocumentWithinOneSingelfile() {
  const templateId = '1jZ15GWOMbiBN8FtLHZbydo38mVNi1TRsQ-vmi9W6YHM'; // Template file ID
  const folderId = '1O4ccFFuBqo8hyYtkeRe9MCHaPFa3j7b7';             // Destination folder ID
  const sheetName = 'Qr-code';
  const urlCell = 'D1'; // Cell to update with the final PDF link

  // --- 1. Prepare data from the spreadsheet ---
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  // Read table names and QR URLs
  const tableNames = sheet.getRange(3, 1, lastRow - 2, 1).getValues().flat();
  const qrUrls     = sheet.getRange(3, 2, lastRow - 2, 1).getValues().flat();

  // --- 2. Create a *single* copy of the template document ---
  const templateFile = DriveApp.getFileById(templateId);
  const finalFile = templateFile.makeCopy('Generated QR Code Document');
  const finalDoc = DocumentApp.openById(finalFile.getId());

  // We'll use the body of this doc to insert each table's info on new pages
  const body = finalDoc.getBody();
  
  // Because the template likely has placeholders for the "first" row,
  // we can replace the placeholders, then for subsequent rows we can *append*.
  const qrReplacementPlaceholderTafelnr = '{{tafelnr}}';
  const qrReplacementPlaceholderQrcode  = '{{qrcode}}';

  // --- 3. Loop over all rows and insert content ---
  for (let i = 0; i < tableNames.length; i++) {
    const name = tableNames[i];
    const url  = qrUrls[i];

    // Skip if missing data
    if (!name || !url) continue;

    // Generate QR code image
    const qrCodeUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(url)}`;
    const qrImageBlob = UrlFetchApp.fetch(qrCodeUrl).getBlob();

    if (i === 0) {
      // For the *first* row, replace placeholders in the existing template
      body.replaceText(qrReplacementPlaceholderTafelnr, name);
      replaceTextToImage(body, qrReplacementPlaceholderQrcode, qrImageBlob);
    } else {
      // For subsequent rows, *append* a new section at the bottom
      body.appendPageBreak();
      // Insert a new paragraph for the table name
      body.appendParagraph(name)
          .setHeading(DocumentApp.ParagraphHeading.NORMAL);

      // Insert the QR code image right after
      body.appendImage(qrImageBlob);
    }
  }

  // --- 4. Save & close the final Doc ---
  finalDoc.saveAndClose();

  // --- 5. Convert the Doc to a single PDF file ---
  const folder = DriveApp.getFolderById(folderId);
  const pdfBlob = finalFile.getAs(MimeType.PDF);
  const pdfFile = folder.createFile(pdfBlob)
    .setName('Generated QR Code Document.pdf');

  // (Optional) If you don't need the Google Doc itself, you can move it to trash:
  // finalFile.setTrashed(true);

  // --- 6. Update the spreadsheet with the PDF's URL ---
  const pdfUrl = pdfFile.getUrl();
  const formula = `=HYPERLINK("${pdfUrl}", "Download Final PDF")`;
  sheet.getRange(urlCell).setFormula(formula);

  Logger.log(`Final PDF generated and moved to the folder: ${pdfUrl}`);
}

/**
 * Replaces a text placeholder in the document body with an image blob.
 *
 * @param {Body} body - The body of the Google Doc
 * @param {string} placeholder - The text placeholder to replace
 * @param {Blob} imageBlob - The image to insert
 * @return {boolean} Whether replacement was successful
 */
function replaceTextToImage(body, placeholder, imageBlob) {
  const searchResult = body.findText(placeholder);
  if (!searchResult) {
    return false; // Placeholder not found
  }
  const element = searchResult.getElement();
  const text = element.asText();
  const offset = searchResult.getStartOffset();
  // Remove the placeholder text
  text.deleteText(offset, offset + placeholder.length - 1);

  // Insert the image at the same position
  const parent = text.getParent();
  parent.asParagraph().insertInlineImage(offset, imageBlob);
  return true;
}
