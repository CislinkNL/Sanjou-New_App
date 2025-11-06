
document.addEventListener('DOMContentLoaded', async () => {
      await setupRealtimeListener(); // Start listening for real-time changes
      await loadStatus();
    //====================================================================================
    //验证程序
    //=====================================================================================================================
    await authenticate(); // Ensure authentication is completed

    // disableTranslatePanel();
});


async function loadStatus() {
    const restNameElem = document.getElementById("restNaam");
    const tafelNummerElem = document.getElementById("tafelNummer");

    // Validate required DOM elements
    if (!restNameElem || !tafelNummerElem) {
        console.error("Required DOM elements (restNaam or tafelNummer) are missing");
        return;
    }

    const restName = restNameElem.innerText.trim();
    const tafelId = tafelNummerElem.innerText.trim();
    const DATABASE_PATH = `${restName}/tafel/Tafel-${tafelId}`;
    console.log(`Tafel ID is ${tafelId} and database path is ${DATABASE_PATH}`);

    try {
        // Authenticate the user
        await authenticate();
    } catch (error) {
        console.error("Failed to authenticate. Cannot load menu:", error);
        return;
    }

    const statusRef = firebase.database().ref(DATABASE_PATH);
   

    try {
        const snapshot = await statusRef.once('value');
        const data = snapshot.val();

        // Validate that data and status exist
        if (!data || !data.Status) {
            console.warn("No table status info available");
            return;
        }

        const currentStatus = data.Status;
        console.log("Table status:", currentStatus);

        // Update the DOM with the current status
        const statusElem = document.getElementById("status");
        if (statusElem) {
            statusElem.innerText = currentStatus;
            console.log(`Table status is updated to: ${currentStatus}`);
        }

        return currentStatus; // Return the status for further use

    } catch (error) {
        console.error("Error fetching table status from Firebase:", error);
    }
}



async function authenticate() {
    try {
        const PythonAuthUrl = document.getElementById("pythonAuth").innerText.trim(); // Wait for the URL to be retrieved
        console.log(`url is: ${PythonAuthUrl}`);
        // Fetch authentication token from the backend
        const response = await fetch(PythonAuthUrl, { method: 'GET' });
        if (!response.ok) {
            throw new Error(`Failed to authenticate with the backend: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.token) {
            // Authenticate with Firebase using the received custom token
            await firebase.auth().signInWithCustomToken(data.token);
            console.log("passed by authentication");
        } else {
            throw new Error("No token received from backend");
        }
    } catch (error) {
        console.error("Authentication error:", error.message);
    }
}
//===========================================================
//用谷歌的这个后台功能来获取url速度实在太慢了
//===========================================================
function fetchPythonAuth() {
    // Wrap google.script.run in a Promise
    return new Promise((resolve, reject) => {
        google.script.run
            .withSuccessHandler((ngrokUrl) => {
                if (ngrokUrl) {
                    resolve(ngrokUrl); // Resolve the Promise with the URL
                } else {
                    reject(new Error("Failed to fetch ngrok URL"));
                }
            })
            .withFailureHandler((error) => {
                reject(new Error(`Error fetching ngrok URL: ${error}`));
            })
            .getNgrokUrl(); // Replace this with your actual Google Apps Script function
    });
}

