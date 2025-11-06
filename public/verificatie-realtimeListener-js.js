
//firebase in action

async function setupRealtimeListener() {
    // Fetch restaurant and table details
    const RestNameUrlElement = document.getElementById('restNaam');
    const tafelIdElement = document.getElementById('tafelNummer');

    // Validate DOM elements
    if (!RestNameUrlElement || !tafelIdElement) {
        console.error("Required DOM elements (restNaam or tafelNummer) are missing.");
        return;
    }

    const RestNameUrl = RestNameUrlElement.innerText.trim();
    const tafelId = `Tafel-${tafelIdElement.innerText.trim()}`; // Add "Tafel-" prefix
    const databasePath = `/${RestNameUrl}/tafel/${tafelId}`;

    if (!RestNameUrl || !tafelId) {
        console.error("Restaurant URL or Table ID is not defined.");
        return;
    }

    console.log(`Setting up real-time listener for path: ${databasePath}`);

    // Setup a real-time listener on the `/tafel` path
    const tafelIdRef = firebase.database().ref(databasePath);
    try {
        // Authenticate the user
        await authenticate();
    } catch (error) {
        console.error("Failed to authenticate. Cannot load menu:", error);
        return;
    }

    // Listen for changes to the children of the specified table ID
    tafelIdRef.on('child_changed', (snapshot) => {
        const key = snapshot.key; // Changed field key (e.g., Status or Pincode)
        const data = snapshot.val(); // New value of the field

        console.log(`Key changed: ${key}, New Value: ${data}`);

        // Handle status updates
        if (key === 'Status' && data) {
    const statusInput = document.querySelector('input[name="status"]'); // Input element for Status
    const tafelStatusElement = document.getElementById("tafelStatus");

    if (statusInput) {
        statusInput.value = data; // Update the input's value with the Status data
        console.log(`Input 'status' updated to: ${data}`);
    }

    if (tafelStatusElement) {
        tafelStatusElement.innerText = `${tafelId} is ${data}`;
        console.log(`Tafel status updated to: ${tafelId} is ${data}`);
    }
    if (data === "afgesloten"){

      showNotification(`${tafelId} is momenteel: ${data}，kan nog geen bestellingen ontvangen`, "info", 10000);
    }
    if (data === 'open'){

    // Example notification (replace with your logic)
    showNotification(`${tafelId} is nu : ${data}，u kunt nu bestellen`, "info", 5000);
    }

}

// Handle pincode updates
if (key === 'Pincode' && data) {
    const pincodeInput = document.querySelector('input[name="pincode"]'); // Input element for Pincode

    if (pincodeInput) {
        pincodeInput.value = data; // Update the input's value with the Pincode data
        showNotification(`Uw pincode is - ${data} - voer deze in om in te loggen`, "info", 5000);
        console.log(`Input 'pincode' updated to: ${data}`);
    } else {
        showNotification(`Let op: Pincode gewijzigd!`, "info", 15000);

    }
}

    });

    console.log("Real-time listener set up successfully.");
}



function refreshTableUI(Data) {
const Pincode = Data.Pincode;
const Status = Data.Status;
document.getElementById("pincode").textContent = Pincode;
document.getElementById("status").textContent = Status;

}

function showNotification(message, type = "info", timeout = 3000) {
  // Create or select the notification container
  let notificationContainer = document.getElementById("notificationContainer");
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.id = "notificationContainer";
    document.body.appendChild(notificationContainer);
  }

  // Create a new notification message
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  // Append the notification to the container
  notificationContainer.appendChild(notification);

  // Automatically remove the notification after a timeout
  setTimeout(() => {
    notification.remove();
  }, timeout); // Adjust the timeout as needed
}


function setupTimerListener() {
    // Fetch table ID and restaurant name from the DOM
    const RestNameUrlElement = document.getElementById('restNaam');
    const tafelIdElement = document.getElementById('tafelNummer');

    if (!RestNameUrlElement || !tafelIdElement) {
        console.error("Required DOM elements (restNaam or tafelNummer) are missing.");
        return;
    }

    const RestNameUrl = RestNameUrlElement.innerText.trim();
    const tafelId = `Tafel-${tafelIdElement.innerText.trim()}`; // Prefix with "Tafel-"

    // Firebase database reference for this table's timer
    const db = firebase.database();
    const timerRef = db.ref(`${RestNameUrl}/tafel/${tafelId}/timer`);

    // Listen for timer data changes
    timerRef.on('value', (snapshot) => {
        const timerData = snapshot.val();

        if (timerData) {
            const { endTime } = timerData;

            // Check if there's still time remaining
            const currentTime = Date.now();
            if (currentTime < endTime) {
                console.log(`Starting countdown for ${tafelId}. Remaining time: ${endTime - currentTime}ms`);

                // Start the timer using updateTimer
                updateTimer(endTime, 'timer', "U kunt nu bestellen", function () {
                    console.log(`Countdown finished for ${tafelId}.`);
                });
            } else {
                console.log(`Countdown already finished for ${tafelId}.`);
            }
        } else {
            console.log(`No timer data available for ${tafelId}.`);
        }
    });

}

