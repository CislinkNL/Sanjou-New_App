function updateFirebaseSettings() {
    const ui = SpreadsheetApp.getUi(); // ✅ Get UI instance for notifications
  try {
        // ✅ Show an initial alert so the user knows their action was registered
    ui.alert("🔄 Bezig met bijwerken...", "De instellingen worden nu bijgewerkt. Dit kan een paar seconden duren.", ui.ButtonSet.OK);

  

    // ✅ Open the spreadsheet and the sheet 'teksten'
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("teksten");

    // ✅ Show processing notification
    sheet.getRange("A1").setValue("⏳ Instellingen worden bijgewerkt..."); 

    // ✅ Fetch values from the specified cells
    const settingsData = {
      max_group1: sheet.getRange("B16").getValue(),
      max_group3: sheet.getRange("B17").getValue(),
      round_time: sheet.getRange("B9").getValue(),
      max_time: sheet.getRange("B15").getValue(),
      allow_self_order: sheet.getRange("B18").getValue()
    };

    // ✅ Convert `allow_self_order` to Boolean (since Firebase stores it as `true/false`)
    settingsData.allow_self_order = settingsData.allow_self_order.toString().toLowerCase() === "true";

    // ✅ Firebase URL - Replace with your actual Firebase project URL
    const firebaseUrl = `${FIREBASE_URL}/${restUrlName}/settings.json`;

    // ✅ Convert data to JSON
    const payload = JSON.stringify(settingsData);

    // ✅ Send PUT request to Firebase
    const options = {
      method: "put",
      contentType: "application/json",
      payload: payload
    };

    const response = UrlFetchApp.fetch(firebaseUrl, options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      sheet.getRange("A1").setValue("✅ Instellingen succesvol bijgewerkt!");
      ui.alert("✅ Succes!", "De instellingen zijn succesvol bijgewerkt naar Firebase.", ui.ButtonSet.OK);
      console.log(`✅ Firebase settings successfully updated:`, settingsData);
      return `✅ Instellingen succesvol bijgewerkt naar Firebase: ${JSON.stringify(settingsData)}`;
    } else {
      sheet.getRange("A1").setValue("❌ Fout bij het bijwerken!");
      ui.alert("❌ Fout!", `Fout bij het bijwerken van instellingen: ${responseCode}`, ui.ButtonSet.OK);
      console.error(`❌ Error updating Firebase settings: ${responseCode}`);
      return `❌ Fout bij het bijwerken van instellingen: ${responseCode}`;
    }
  } catch (error) {
    const ui = SpreadsheetApp.getUi();
    sheet.getRange("A1").setValue("❌ Fout: " + error.message);
    ui.alert("❌ Fout!", `Er is een fout opgetreden: ${error.message}`, ui.ButtonSet.OK);
    console.error(`❌ Error in updateFirebaseSettings:`, error);
    return `❌ Fout: ${error.message}`;
  }
}

