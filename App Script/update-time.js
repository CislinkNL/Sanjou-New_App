// update time 

function autoCloseTable() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bestelSheet = ss.getSheetByName('bestellingen');
  const now = getCurrentTime(); // Ensure this returns a Date object
  const maxTijdSheet = ss.getSheetByName('teksten');
  const maxTijd = parseInt(maxTijdSheet.getRange('B15').getValue());

  Logger.log('maxTijd: ' + maxTijd);

  // Check that now is a valid Date object
  if (!(now instanceof Date) || isNaN(now.getTime())) {
    Logger.log('getCurrentTime did not return a valid Date object.');
    return;
  }

  const lastRow = bestelSheet.getLastRow();
  const timeColumnValues = bestelSheet.getRange('I2:I' + lastRow).getValues();
  const columnBValues = bestelSheet.getRange('B2:B' + lastRow).getValues();

  // Reset all font colors in column G to white (default)
  bestelSheet.getRange('A2:D' + lastRow).setFontColor(null).setBackground(null);

  const correspondingValues = [];
  const rowNumbers = [];

  // Loop through the date values
  for (let i = 0; i < timeColumnValues.length; i++) {
    const cellValue = timeColumnValues[i][0];
    if (cellValue) {
      const timeValue = new Date(cellValue);
      if (!isNaN(timeValue.getTime())) {
        const timeDiff = now.getTime() - timeValue.getTime();
          Logger.log(timeDiff)
        // Existing functionality to find corresponding values within a specific time range
        if (timeDiff >= (maxTijd * 60 * 1000) && timeDiff <= ((maxTijd + 5) * 60 * 1000)) {
          correspondingValues.push(columnBValues[i][0]);
          
        }
        // New functionality to check for time difference less than 15 minutes and change font color
        if (timeDiff >= ((maxTijd - 15) * 60 * 1000) && timeDiff <= (maxTijd * 60 * 1000)) { // Check for less than 15 minutes difference
          rowNumbers.push(i + 2); // Record the row number to change the font color later
          
        }
      } else {
        Logger.log(`Invalid date at row: ${i + 2}, Value: ${cellValue}`);
      }
    }
  }

  // Change the font color of cells in column G for rows identified in the new condition
  rowNumbers.forEach(rowNumber => {
    bestelSheet.getRange('A2:B' + rowNumber).setFontColor("red").setFontSize(15).setFontStyle("italic");
    Logger.log(rowNumber)
  });

  Logger.log('Corresponding Values in Column B: ' + correspondingValues.join(', '));
  Logger.log('Font color changed for rows with Time < 15 Minutes.');


  // Call function to close tables based on the table numbers found
  searchTabelAndClose(correspondingValues);

  return;
}


function getCurrentTime() {
  // This function should return a valid Date object representing the current time.
  return new Date(); // This is a simple implementation.
}


function searchTabelAndClose(tafelNrs) {
  const qrSheet = ss.getSheetByName('Qr-code'); // Access the "Qr-code" sheet
  const columnAValues = qrSheet.getRange('A1:A' + qrSheet.getLastRow()).getValues(); // Get all values in Column A

  
  // Ensure each value from Column A is treated as a string for case-insensitive comparison
  const lowercaseColumnAValues = columnAValues.map(function(row) {
    // Convert to string explicitly to avoid errors
    return String(row[0]).toLowerCase();
  });
  
  // Iterate through each table number/name passed to the function
  tafelNrs.forEach(function(tafelNr) {
    // Convert the current table number/name to lowercase for case-insensitive comparison
    const lowercaseTafelNr = String(tafelNr).toLowerCase();
    
    // Find the row index for the table number/name in Column A
    const rowIndex = lowercaseColumnAValues.findIndex(function(lowercaseValue) {
      return lowercaseValue === lowercaseTafelNr;
    });
 
    
    // If the table number/name is found, rowIndex will be >= 0
    if (rowIndex >= 0) {
      // Correctly use Logger.log() to log the rowIndex
      Logger.log('Row index found: ' + (rowIndex + 1)); // Adding 1 because spreadsheet rows are 1-indexed
      
      // Set 'afgesloten' in Column J for the matching row
      qrSheet.getRange('E' + (rowIndex + 1)).setValue('afgesloten');
      const rowReset = rowIndex + 1;
      callReset(rowReset, tafelNr)
    } else {
      // Log if the table number/name is not found
      Logger.log('Table number/name not found: ' + tafelNr);
    }
  });
}



function updateTime() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('bestellingen');
  const cell = sheet.getRange("H4"); // Specify the cell where you want the time, e.g., A1
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm");
  cell.setValue(currentTime);
  autoCloseTable();
}




function getCurrentTime() {
  return new Date(); // This will return the current date and time as a Date object
}


function setTimeTrigger(){
ScriptApp.newTrigger("updateTime")
  .timeBased()
  .everyMinutes(5) // Set the trigger to run every 5 minutes
  .create();


}

function deleteTimeTrigger(){
  // Get all project triggers
  const triggers = ScriptApp.getProjectTriggers();
  
  for (let i = 0; i < triggers.length; i++) {
    // Check if the trigger is for the updateTime function
    if (triggers[i].getHandlerFunction() == "updateTime") {
      // Delete the trigger
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }


}

