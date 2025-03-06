import React, { useEffect, useState } from "react";
import { Box, Text, Flex, Select } from "@chakra-ui/react";
import Papa from "papaparse";
import { Line } from "react-chartjs-2";
import { Chart } from "chart.js";  // wichtig, damit wir die Default-Funktionen aufrufen können
import "chart.js/auto";

// --- Plugin, das geschlossene Bereiche (null-Werte) grau hinterlegt ---
const closedTimesPlugin = {
    id: "closedTimesPlugin",
    beforeDatasetsDraw: (chart) => {
        const { ctx, chartArea, data, scales } = chart;
        const { top, bottom } = chartArea;
        const xScale = scales.x;

        // Wir nehmen an, dein einziger Datensatz liegt an Index 0
        const dataset = data.datasets[0]?.data || [];
        let regionStart = null;
        const nullRegions = [];

        // Durch Dataset loopen und zusammenhängende null-Bereiche finden
        for (let i = 0; i < dataset.length; i++) {
            if (dataset[i] === null) {
                if (regionStart === null) {
                    regionStart = i;
                }
            } else {
                if (regionStart !== null) {
                    nullRegions.push([regionStart, i - 1]);
                    regionStart = null;
                }
            }
        }
        // Falls es bis zum Ende null war
        if (regionStart !== null) {
            nullRegions.push([regionStart, dataset.length - 1]);
        }

        // Jetzt jeden null-Bereich grau hinterlegen
        ctx.save();
        ctx.fillStyle = "rgba(200,200,200,0.4)";
        nullRegions.forEach(([startIdx, endIdx]) => {
            const xStart = xScale.getPixelForValue(startIdx);
            const xEnd   = xScale.getPixelForValue(endIdx);
            ctx.fillRect(xStart, top, xEnd - xStart, bottom - top);
        });
        ctx.restore();
    },
};

export function AnalysisPage() {
    const [data, setData] = useState(null);
    const [selectedParkhaus, setSelectedParkhaus] = useState("");
    const [selectedOption, setSelectedOption] = useState("Alle");
    const [chartData, setChartData] = useState(null);

    // Erlaubte Parkhäuser
    const allowedParkhaeuser = [
        "PH Theater",
        "PP Hörsterplatz",
        "PH Alter Steinweg",
        "Busparkplatz",
        "PP Schlossplatz Nord",
        "PP Schlossplatz Süd",
        "PH Aegidii",
        "PH Georgskommende",
        "PH Münster Arkaden",
        "PH Karstadt",
        "PH Stubengasse",
        "PH Bremer Platz",
        "PH Engelenschanze",
        "PH Bahnhofstraße",
        "PH Cineplex",
        "PH Stadthaus 3",
    ];

    // Öffnungszeiten als Roh-Strings
    const openingHours = {
        "PH Cineplex": "[0, 24]",
        "PH Stadthaus 3": "[0, 24]",
        "PH Alter Steinweg": "[0, 24]",
        "PH Bremer Platz": "[0, 24]",

        "PP Hörsterplatz": "[7, 22] (So geschlossen)",
        "PH Karstadt": "[7, 20] (So geschlossen)",
        "PP Georgskommende": "[7, 21] (So geschlossen)",

        "PH Theater": "[7, 24] (So ab 09:00)",
        "PH Aegidii": "[7, 24] (So ab 09:00)",
        "PH Stubengasse": "[7, 24] (So ab 09:00)",
        "PH Engelenschanze": "[7, 24]",

        "Busparkplatz": "[7, 21] (So ab 09:00)",
        "PP Schlossplatz Nord": "[7, 21] (So ab 09:00)",
        "PP Schlossplatz Süd": "[7, 21] (So ab 09:00)",

        "PH Bahnhofstraße": "[6, 24]",
        "PH Münster Arkaden": "[8, 23] (So ab 10:00)",
    };

    // Klartext-Öffnungszeiten
    const openingHoursReadable = {
        "PH Cineplex": "Daily 00:00–24:00 (continuously open)",
        "PH Stadthaus 3": "Daily 00:00–24:00 (continuously open)",
        "PH Alter Steinweg": "Daily 00:00–24:00 (continuously open)",
        "PH Bremer Platz": "Daily 00:00–24:00 (continuously open)",
        "PH Coesfelder Kreuz": "closed",
        "PP Hörsterplatz": "Mo–Sa 07:00–22:00, Su: closed",
        "PH Karstadt": "Mo–Sa 07:30–20:30, Su: closed",
        "PP Georgskommende": "Mo–Sa 07:00–21:00, Su: closed",
        "PH Theater": "Mo–Sa 07:00–24:00, Su 09:00–24:00",
        "PH Aegidii": "Mo–Sa 07:00–24:00, Su 09:00–24:00",
        "PH Stubengasse": "Mo–Sa 07:00–24:00, Su 09:00–24:00",
        "PH Engelenschanze": "Daily 07:00–24:00",
        "Busparkplatz": "Mo–Sa 07:00–21:00, Su 09:00–21:00",
        "PP Schlossplatz Nord": "Mo–Sa 07:00–21:00, Su 09:00–21:00",
        "PP Schlossplatz Süd": "Mo–Sa 07:00–21:00, Su 09:00–21:00",
        "PH Bahnhofstraße": "Daily 06:00–24:00",
        "PH Münster Arkaden": "Mo–Sa 08:00–23:00, Su 10:00–23:00",
    };

    // Öffnungszeiten-Helfer
    function getOpenCloseTimes(parkhaus, weekday) {
        if (!openingHours[parkhaus]) {
            // Fallback: rund um die Uhr offen
            return { openHour: 0, closeHour: 24, closedAllDay: false };
        }
        const rangeStr = openingHours[parkhaus];
        const bracketMatch = rangeStr.match(/\[(\d{1,2}),\s*(\d{1,2})\]/);

        let openHour = 0;
        let closeHour = 24;
        if (bracketMatch) {
            openHour = parseInt(bracketMatch[1], 10);
            closeHour = parseInt(bracketMatch[2], 10);
        }

        const parenPart = rangeStr.replace(bracketMatch?.[0] || "", "").trim();
        // Besonderheiten für Sonntag
        if (weekday === "Sunday") {
            if (parenPart.includes("So geschlossen")) {
                return { openHour: 0, closeHour: 0, closedAllDay: true };
            }
            const soAbMatch = parenPart.match(/So ab (\d{1,2}):?(\d{2})?/);
            if (soAbMatch) {
                const soOpen = parseInt(soAbMatch[1], 10);
                return { openHour: soOpen, closeHour, closedAllDay: false };
            }
        }
        return { openHour, closeHour, closedAllDay: false };
    }

    // (Optional) Live-Daten abrufen
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("https://parkingms-ol01.onrender.com/api/parking-data");
                if (!response.ok) {
                    throw new Error(`Error fetching data: ${response.statusText}`);
                }
                const result = await response.json();
                // setLiveData(result);
            } catch (err) {
                console.error(err);
            }
        };
        fetchData();
    }, []);

    // CSV laden
    useEffect(() => {
        fetch("data/average_Parkhausdaten_week.csv")
            .then(response => response.text())
            .then(csvText => {
                const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
                setData(parsedData.data);

                // Erstes Parkhaus finden
                const firstParkhaus = Object.keys(parsedData.data[0]).find(
                    key => key !== "Uhrzeit" && key !== "Wochentag" && allowedParkhaeuser.includes(key)
                );
                setSelectedParkhaus(firstParkhaus || "");
            })
            .catch(error => console.error("Fehler beim Laden der CSV-Daten:", error));
    }, []);

    // Chart-Daten bauen
    useEffect(() => {
        if (!data || !selectedParkhaus) return;

        // ggf. Filtern auf gewählten Wochentag, sonst "Alle"
        const filteredData =
            selectedOption === "Alle"
                ? data
                : data.filter(row => row["Wochentag"] === selectedOption);

        const labels = [];
        const values = [];

        filteredData.forEach((row) => {
            const weekday = row["Wochentag"];
            const { openHour, closeHour, closedAllDay } = getOpenCloseTimes(selectedParkhaus, weekday);

            // CSV-Zeit "HH:MM:SS" => float
            const [hh, mm] = row["Uhrzeit"].split(":");
            const hourFloat = parseInt(hh, 10) + parseInt(mm, 10) / 60;

            labels.push(row["Uhrzeit"]);

            if (closedAllDay || hourFloat < openHour || hourFloat >= closeHour) {
                // geschlossen => null
                values.push(null);
            } else {
                values.push(parseFloat(row[selectedParkhaus] || 0));
            }
        });

        setChartData({
            labels,
            datasets: [
                {
                    label: `Free Parking Spots: ${selectedParkhaus} (${selectedOption})`,
                    data: values,
                    borderColor: "#2d7d9f",
                    backgroundColor: "rgba(45,125,159,0.2)",
                },
            ],
        });
    }, [data, selectedParkhaus, selectedOption]);

    return (
        <Flex direction="column" height="100vh" width="100%">
            {/* Auswahlfelder */}
            <Flex justifyContent="center" alignItems="center" padding="4" gap="4">
                {/* Auswahl Parkhaus */}
                <Select
                    value={selectedParkhaus}
                    onChange={e => setSelectedParkhaus(e.target.value)}
                    width="300px"
                >
                    {data && Object.keys(data[0])
                        .filter(key =>
                            key !== "Uhrzeit" &&
                            key !== "Wochentag" &&
                            allowedParkhaeuser.includes(key)
                        )
                        .map(parkhaus => (
                            <option key={parkhaus} value={parkhaus}>
                                {parkhaus}
                            </option>
                        ))}
                </Select>

                {/* Auswahl Wochentag */}
                <Select
                    value={selectedOption}
                    onChange={e => setSelectedOption(e.target.value)}
                    width="300px"
                >
                    <option value="Alle">All Weekdays</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                </Select>
            </Flex>

            {/* Diagramm-Container */}
            <Flex flex="1" justifyContent="center" alignItems="center">
                <Box
                    backgroundColor="white"
                    borderWidth="1px"
                    borderRadius="lg"
                    boxShadow="lg"
                    width="80%"
                    height="80%"
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                >
                    <Text fontSize="2xl" fontWeight="bold" marginBottom="4">
                        Parking-Facility
                    </Text>

                    {/* Klartext-Öffnungszeiten */}
                    {selectedParkhaus && openingHoursReadable[selectedParkhaus] && (
                        <Text fontSize="small">
                            {openingHoursReadable[selectedParkhaus]}
                        </Text>
                    )}

                    {/* Chart */}
                    {chartData ? (
                        <Box width="100%" height="100%">
                            <Line
                                data={chartData}
                                options={{
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            display: true,
                                            labels: {
                                                // Standard-Liste plus Eintrag für "Closed Times" hinzufügen
                                                generateLabels: (chart) => {
                                                    // Hol die Standardlabels (unsere DataSet-Legende)
                                                    const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                                    // Füge einen Eintrag für "Closed Times" hinzu
                                                    labels.push({
                                                        text: "Closed Times",
                                                        fillStyle: "rgba(200,200,200,0.4)", // grauer Kasten
                                                        strokeStyle: "rgba(200,200,200,0.4)",
                                                        hidden: false,
                                                        // Ein paar Defaults wie lineCap, lineDash, etc.
                                                        lineCap: "butt",
                                                        lineDash: [],
                                                        lineDashOffset: 0,
                                                        lineJoin: "miter",
                                                    });
                                                    return labels;
                                                },
                                            },
                                            // Klick auf "Closed Times" soll nichts tun
                                            onClick: (evt, legendItem, legend) => {
                                                if (legendItem.text === "Closed Times") {
                                                    // do nothing
                                                    return;
                                                }
                                                // Standard-Verhalten für unsere Datensätze
                                                Chart.defaults.plugins.legend.onClick(evt, legendItem, legend);
                                            },
                                        },
                                    },
                                }}
                                plugins={[closedTimesPlugin]}
                            />
                        </Box>
                    ) : (
                        <Text>Loading Data...</Text>
                    )}
                </Box>
            </Flex>
        </Flex>
    );
}
