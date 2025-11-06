
function generateQrCodePdf() {
  const sheetName = "Qr-code"; // Sheet name
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const lastRow = sheet.getDataRange().getLastRow();

  const nameRange = `A3:A${lastRow}`; // Range for names
  const urlRange = `D3:D${lastRow}`; // Range for URLs
  const pdfFileName = "FDM-qr-codes.pdf";
  const linkCell = "C1"; // Cell to update with the download link

  const names = sheet.getRange(nameRange).getValues().flat(); // Extract names
  const urls = sheet.getRange(urlRange).getValues().flat(); // Extract URLs

  const doc = DocumentApp.create(pdfFileName);
  const body = doc.getBody();

  const qrCodeSize = 180; // QR code size in pixels
  let table = body.appendTable(); // Create a table for alignment
  table.setBorderWidth(0); // Remove table borders

  for (let i = 0; i < names.length; i++) {
    if (names[i] && urls[i]) {
      const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(urls[i])}&size=${qrCodeSize}`;
      const imageBlob = UrlFetchApp.fetch(qrCodeUrl).getBlob();

      // Start a new table if this is the first QR code on a new page
      if (i % 6 === 0 && i !== 0) {
        body.appendPageBreak(); // Insert a page break after 6 QR codes
        table = body.appendTable(); // Start a new table for the next page
        table.setBorderWidth(0);
      }

      if (i % 3 === 0) {
        table.appendTableRow(); // Create a new row every three QR codes
      }

      const row = table.getRow(table.getNumRows() - 1);
      const cell = row.appendTableCell();

      // Add the label
      const labelParagraph = cell.appendParagraph(names[i]);
      labelParagraph.setFontSize(16).setBold(true).setAlignment(DocumentApp.HorizontalAlignment.CENTER);

      // Add the QR code
      const qrCodeImage = cell.appendImage(imageBlob);
      qrCodeImage.setWidth(qrCodeSize).setHeight(qrCodeSize);

      // Adjust cell padding for better appearance
      cell.setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(5).setPaddingRight(5);
    }
  }

  doc.saveAndClose();
  const pdfFile = DriveApp.getFileById(doc.getId()).getAs("application/pdf");

  const folder = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents().next();
  const savedPdf = folder.createFile(pdfFile).setName(pdfFileName);

  const pdfUrl = savedPdf.getUrl();
  const hyperlinkFormula = `=HYPERLINK("${pdfUrl}"; "Download qr-codes")`;
  sheet.getRange(linkCell).setValue(hyperlinkFormula);

  DriveApp.getFileById(doc.getId()).setTrashed(true);

  Logger.log("PDF with six QR codes per page generated successfully!");
  Logger.log(`PDF URL: ${pdfUrl}`);
}
