// Appscript function for Personeel

function getRestData() {
  const Data = {};
  const tekstenSheet = menuKaart.getSheetByName("teksten");
  // Adjust the range to include column E
  const tekstenRange = tekstenSheet.getRange("A1:E60");
  const tekstenValues = tekstenRange.getValues();

  // Your mapping code remains the same, just ensure the range includes all needed data
  Data.LOGO = tekstenValues[41][1]; // Assuming B42 contains the logo URL
  Data.restNaam = tekstenValues[37][1]; // Assuming B38 contains the restaurant name
  Data.Cat1 = tekstenValues[22][0]; // Adjusted for zero-based indexing, and so on...
  // Continue mapping other values...
  Data.Cat14id = tekstenValues[22][4]; // Now correctly points to E23, thanks to the expanded range

  return Data;
}
