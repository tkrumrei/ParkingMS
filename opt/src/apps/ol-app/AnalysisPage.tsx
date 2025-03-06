import React, { useEffect, useState } from "react";
import { Box, Text, Flex, Select } from "@chakra-ui/react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import Papa from "papaparse";

export function AnalysisPage() {
    const [data, setData] = useState(null);
    const [selectedParkhaus, setSelectedParkhaus] = useState("");
    const [selectedOption, setSelectedOption] = useState("Alle");
    const [chartData, setChartData] = useState(null);
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
        "PH Stadthaus 3"
    ];
    // ToDo: Add opening hours for all parking facilities
    const openingHours = {
        "PH Theater": "[7, 22]",
        "PP Hörsterplatz": "[7, 22]",
        "PH Alter Steinweg": "[7, 22]",
        "Busparkplatz": "[0, 24]",
        "PP Schlossplatz Nord": "[7, 22]",
        "PP Schlossplatz Süd": "[7, 22]",
        "PH Aegidii": "[7, 22]",
        "PH Georgskommende": "[7, 22]",
        "PH Münster Arkaden": "[7, 22]",
        "PH Karstadt": "[7, 22]",
        "PH Stubengasse": "[7, 22]",
        "PH Bremer Platz": "[7, 22]",
        "PH Engelenschanze": "[7, 22]",
        "PH Bahnhofstraße": "[7, 22]",
        "PH Cineplex": "[7, 22]",
        "PH Stadthaus 3": "[7, 22]"
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("https://parkingms-ol01.onrender.com/api/parking-data");
                if (!response.ok) {
                    throw new Error(`Error fetching data: ${response.statusText}`);
                }
                const result = await response.json();
            } catch (err) {
                console.error(err);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        fetch("data/average_Parkhausdaten_week.csv")
            .then(response => response.text())
            .then(csvText => {
                const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
                setData(parsedData.data);

                const firstParkhaus = Object.keys(parsedData.data[0])
                    .find(key => key !== "Uhrzeit" && key !== "Wochentag" && allowedParkhaeuser.includes(key));
                setSelectedParkhaus(firstParkhaus || "");
            })
            .catch(error => console.error("Fehler beim Laden der CSV-Daten:", error));
    }, []);

    useEffect(() => {
        if (!data || !selectedParkhaus) return;

        // Filtere die Daten nach Wochentag (außer "Alle" ist gewählt)
        const filteredData = selectedOption === "Alle"
            ? data
            : data.filter(row => row["Wochentag"] === selectedOption);

        const labels = filteredData.map(row => row["Uhrzeit"]);
        const values = filteredData.map(row => parseFloat(row[selectedParkhaus] || 0));

        setChartData({
            labels,
            datasets: [
                {
                    label: `Free Parking Spots: ${selectedParkhaus} (${selectedOption})`,
                    data: values,
                    borderColor: "#2d7d9f",
                    backgroundColor: "rgba(45, 125, 159, 0.2)",
                },
            ],
        });
    }, [data, selectedParkhaus, selectedOption]);

    return (
        <Flex direction="column" height="100vh" width="100%">
            <Flex justifyContent="center" alignItems="center" padding="4" gap="4">
                <Select value={selectedParkhaus} onChange={e => setSelectedParkhaus(e.target.value)} width="300px">
                    {data && Object.keys(data[0])
                        .filter(key => key !== "Uhrzeit" && allowedParkhaeuser.includes(key))
                        .map(parkhaus => (
                            <option key={parkhaus} value={parkhaus}>{parkhaus}</option>
                        ))}
                </Select>
                <Select value={selectedOption} onChange={e => setSelectedOption(e.target.value)} width="300px">
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
            {/* Diagramm-Container mit flexibler Höhe */}
            <Flex flex="1" justifyContent="center" alignItems="center">
                <Box backgroundColor="white" borderWidth="1px" borderRadius="lg" boxShadow="lg" width="80%" height="80%" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                    <Text fontSize="2xl" fontWeight="bold" marginBottom="4">Parking-Facility</Text>
                    {selectedParkhaus && openingHours[selectedParkhaus] && (
                        <Text fontSize="small">
                            {openingHours[selectedParkhaus]}
                        </Text>
                    )}
                    {chartData ? <Box width="100%" height="100%"><Line data={chartData} options={{ maintainAspectRatio: false }} /></Box> : <Text>Loading Data...</Text>}
                </Box>
            </Flex>
        </Flex>
    );
}
