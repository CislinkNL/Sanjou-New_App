function onOpen() {
  // Add a custom menu to the Google Sheets UI
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Menu Beheer') // Replace 'Menu' with your desired menu name
    .addItem('Handige Links', 'showSidebar') // Add menu item to open the sidebar
    .addToUi();
    showSidebar();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Asian Boulevard') // Title of the sidebar
    .setWidth(300); // Adjust width if needed
  SpreadsheetApp.getUi().showSidebar(html);
}

// Example functions triggered by buttons
function functionOne() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Function One Triggered!');
}

function functionTwo() {
  SpreadsheetApp.getActiveSpreadsheet().toast('Function Two Triggered!');
}

function showPersoneel() {
  const html = HtmlService.createHtmlOutputFromFile('personeel')
    .setTitle('Tafel Beheer') // Title of the sidebar
    .setWidth(650)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no');; // Adjust width if needed
  SpreadsheetApp.getUi().showSidebar(html);
}


function getTekstenValue() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("teksten");
    var url = sheet.getRange("A62").getValue(); // Fetch URL from A62
    return url ? url.toString() : ""; // Return as string (fallback to empty if null)
}
