const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
app.use(cors()); // 🔥 This allows all origins
app.use(bodyParser.json());


// 1. Initialize the WhatsApp client with persistent authentication
const path = require('path');
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: path.resolve(__dirname, '.local-chromium', 'win64-1045629', 'chrome-win', 'chrome.exe'),
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});



// 2. Display QR code for authentication
client.on('qr', qr => {
    console.log("Scan the QR code with WhatsApp:");
    qrcode.generate(qr, { small: true });
});

// 3. Confirm when the client is ready
client.on('ready', () => {
    console.log("✅ WhatsApp bot is ready!");
});

// 4. Function to send a message
const sendMessage = async (phoneNumber, message) => {
    if (Array.isArray(phoneNumber)) {
        throw new Error("sendMessage only accepts a single phone number string");
    }

    const formattedNumber = phoneNumber.includes("@c.us")
        ? phoneNumber
        : `${phoneNumber}@c.us`;

    await client.sendMessage(formattedNumber, message);
    console.log(`📤 Message sent to ${phoneNumber}: ${message}`);
};


// 5. Listen for incoming messages (optional)
client.on('message', async msg => {
    console.log(`💬 Received message from ${msg.from}: ${msg.body}`);
    
    if (msg.body.toLowerCase() === "hello") {
        msg.reply("Hi! This is an automated response 🤖");
    }
});

// 6. Start the WhatsApp client
client.initialize();

// 7. Setup Express server for dynamic messaging
// Removed duplicate app declaration since it's already declared above.
app.use(bodyParser.json());
app.post('/send', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).send({ error: "Missing phone or message" });
    }

    const phoneList = Array.isArray(phone) ? phone : [phone];
    const results = [];

    for (const number of phoneList) {
        try {
            await sendMessage(number, message);
            results.push({ to: number, success: true });
        } catch (err) {
            results.push({ to: number, success: false, error: err.message });
        }
    }

    res.send({ success: results.every(r => r.success), results });
});



// 8. Start the server
const PORT = 3060;
app.listen(PORT, () => {
    console.log(`🚀 API server running at http://localhost:${PORT}`);
});
