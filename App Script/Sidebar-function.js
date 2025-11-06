function onOpen() {
  // Add a custom menu to the Google Sheets UI
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('餐牌管理') // Replace 'Menu' with your desired menu name
    .addItem('管理页面', 'showSidebar') // Add menu item to open the sidebar
    .addToUi();
    showSidebar();
}

function showSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Kokohili Amsterdam Menu Beheer') // Title of the sidebar
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