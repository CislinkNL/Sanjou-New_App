//Function for reseting table

function callReset(tableUrl,rowNum){

var pinCode = ss.getRange('J' + rowNum).getValue()



console.log(tableUrl)
var tableResetUrl = tableUrl + '?page=reset' + pinCode;

console.log(tableResetUrl)
  try {
    var response = UrlFetchApp.fetch(tableResetUrl);
    Logger.log('gelukt!'); // Logs the response content
  } catch (error) {
    Logger.log("Error calling Web App: " + error.toString());
  }
}


function deleteRecord(tafelNr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const recordSheet = ss.getSheetByName('overzicht');

  // Get the range of column C where we need to search for tafelNr
  const columnC = recordSheet.getRange('C:C');
  const values = columnC.getValues(); // Get all values in column C as an array

  // It is crucial to loop backward when deleting rows to avoid skipping rows after deletions
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] === tafelNr) { // Check if the cell contains tafelNr
      // Delete the entire row, adjust i+1 because rows are 1-indexed in Google Sheets
      recordSheet.deleteRow(i + 1);
    }
  }
}

