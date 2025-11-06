function setInCellImage() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var range = sheet.getActiveCell(); // Get the currently active cell
  var row = range.getRow(); // Get the current row number
  
  var url = sheet.getRange(row, 6).getValue(); // Get the URL from column 'I' (9th column)
  
  if (url) {
    var formula = '=IMAGE("' + url + '"; 1)'; // Create the formula to insert the image
    sheet.getRange(row, 3).setFormula(formula); // Set the formula in column 'E' (5th column)
  } else {
    Logger.log('No URL found in column I for row ' + row);
  }
}

function setInCellImages() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  
  for (var row = 2; row <= lastRow; row++) {
    var url = sheet.getRange(row, 6).getValue(); // Get the URL from column 'I' (9th column)
    
    if (url) {
      var formula = '=IMAGE("' + url + '"; 1)'; // Create the formula to insert the image
      sheet.getRange(row, 3).setFormula(formula); // Set the formula in column 'E' (5th column)
    }
  }
}
