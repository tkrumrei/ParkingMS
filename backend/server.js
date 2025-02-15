const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

app.get("/api/parking-data", async (req, res) => {
    const url = "https://www.stadt-muenster.de/ms/tiefbauamt/pls/PLS-INet.xml";
    try {
        const response = await fetch(url, { timeout: 5000 });
        if (!response.ok) throw new Error(`HTTP Fehler: ${response.status}`);

        const textData = await response.text();
        res.header("Content-Type", "application/xml");
        res.send(textData);
    } catch (error) {
        console.error("Fehler beim Abrufen der XML-Daten:", error);
        res.status(500).json({ error: "Fehler beim Abrufen der Daten." });
    }
});

// Keep-Alive-Funktion: Ping alle 10 Minuten
setInterval(() => {
    fetch("https://parkingms-ol01.onrender.com/api/keep-alive")
        .then(res => res.text())
        .then(text => console.log(`Keep-Alive: ${text}`))
        .catch(err => console.error("Keep-Alive Fehler:", err));
}, 10 * 60 * 1000); // Alle 10 Minuten

// Extra Route, damit der Server sich selbst pingen kann
app.get("/api/keep-alive", (req, res) => {
    res.send("Server ist wach!");
});

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
