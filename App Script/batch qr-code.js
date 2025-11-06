function generateQrCodePdfWithThreeColumns() {
  const sheetName = "Qr-code"; // Sheet name
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const lastRow = sheet.getDataRange().getLastRow();
  const nameRange = `A3:A${lastRow}`; // Range for names
  const urlRange = `D3:D${lastRow}`; // Range for URLs
  const pdfFileName = "Asian-Boulevard-qr-codes.pdf";
  const linkCell = "C1"; // Cell to update with the download link

  // Get names and URLs from the sheet
  const names = sheet.getRange(nameRange).getValues().flat(); // Extract names
  const urls = sheet.getRange(urlRange).getValues().flat(); // Extract URLs

  // Create a new Google Doc
  const doc = DocumentApp.create(pdfFileName);
  const body = doc.getBody();

  // Set the QR code size
  const qrCodeSize = 150; // QR code size in pixels

  // Generate QR codes and add them to the document in a three-column layout
  let table = body.appendTable(); // Create a table for alignment
  table.setBorderWidth(0); // Remove table borders

  for (let i = 0; i < names.length; i++) {
    if (names[i] && urls[i]) {
      const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(urls[i])}&size=${qrCodeSize}`;
      const imageBlob = UrlFetchApp.fetch(qrCodeUrl).getBlob();

      if (i % 3 === 0) {
        // Create a new row every three QR codes
        table.appendTableRow();
      }

      // Add the text and QR code in a cell using a nested table
      const row = table.getRow(table.getNumRows() - 1);
      const cell = row.appendTableCell();

      // Create a nested table to keep the text and QR code together
      const nestedTable = cell.appendTable();
      nestedTable.setBorderWidth(0); // Remove borders of the nested table

      // Add text row
      const textRow = nestedTable.appendTableRow();
      const textCell = textRow.appendTableCell();
      const textParagraph = textCell.appendParagraph(names[i]);
      textParagraph.setFontSize(12).setAlignment(DocumentApp.HorizontalAlignment.CENTER);

      // Add QR code row
      const qrRow = nestedTable.appendTableRow();
      const qrCell = qrRow.appendTableCell();
      const qrImage = qrCell.appendImage(imageBlob);
      qrImage.setWidth(qrCodeSize).setHeight(qrCodeSize);

      // Align QR cell
      qrCell.setPaddingTop(5);
      qrCell.setPaddingBottom(5);
      qrCell.setPaddingLeft(5);
      qrCell.setPaddingRight(5);
    }
  }

  // Save and convert the Google Doc to PDF
  doc.saveAndClose();
  const pdfFile = DriveApp.getFileById(doc.getId()).getAs("application/pdf");

  // Move the PDF to the specified folder by ID
  const targetFolderId = "1WOrVwCwzxxj060aWOULRqcK_vgy8zarh";
  const targetFolder = DriveApp.getFolderById(targetFolderId);
  const savedPdf = targetFolder.createFile(pdfFile).setName(pdfFileName);

  // Get the URL of the saved PDF
  const pdfUrl = savedPdf.getUrl();

  // Update the C1 cell in the Qr-code sheet with the hyperlink using a semicolon as a separator
  const hyperlinkFormula = `=HYPERLINK("${pdfUrl}"; "Download qr-codes")`;
  sheet.getRange(linkCell).setValue(hyperlinkFormula);

  // Delete the intermediate Google Doc
  DriveApp.getFileById(doc.getId()).setTrashed(true);

  Logger.log("PDF with three-column QR codes and centered text above generated successfully!");
  Logger.log(`PDF URL: ${pdfUrl}`);
}
