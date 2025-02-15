const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // Erlaubt Anfragen von deiner GitHub Pages-Seite

// Route für Parkhausdaten
app.get("/api/parking-data", async (req, res) => {
    const url = "https://www.stadt-muenster.de/ms/tiefbauamt/pls/PLS-INet.xml";

    try {
        const response = await fetch(url);
        const textData = await response.text();

        // XML in JSON umwandeln
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(textData, "application/xml");

        const parkhaeuser = Array.from(xmlDoc.getElementsByTagName("parkhaus")).map((node) => ({
            bezeichnung: node.getElementsByTagName("bezeichnung")[0]?.textContent || "",
            gesamt: parseInt(node.getElementsByTagName("gesamt")[0]?.textContent || "0"),
            frei: parseInt(node.getElementsByTagName("frei")[0]?.textContent || "0"),
            status: node.getElementsByTagName("status")[0]?.textContent || "",
            zeitstempel: node.getElementsByTagName("zeitstempel")[0]?.textContent || "",
        }));

        res.json(parkhaeuser);
    } catch (error) {
        console.error("Fehler beim Abrufen der XML-Daten:", error);
        res.status(500).json({ error: "Fehler beim Abrufen der Daten." });
    }
});

app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
