import React, { useEffect, useState } from "react";
import { Box, Text, Flex, Select } from "@chakra-ui/react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import Papa from "papaparse";

export function AnalysisPage() {
    const [data, setData] = useState(null);
    const [selectedParkhaus, setSelectedParkhaus] = useState("");
    const [chartData, setChartData] = useState(null);

    useEffect(() => {
        fetch("/data/average_Parkhausdaten_week.csv")
            .then(response => response.text())
            .then(csvText => {
                const parsedData = Papa.parse(csvText, { header: true, skipEmptyLines: true });
                setData(parsedData.data);

                const firstParkhaus = Object.keys(parsedData.data[0]).find(key => key !== "Datum und Uhrzeit");
                setSelectedParkhaus(firstParkhaus);
            })
            .catch(error => console.error("Fehler beim Laden der CSV-Daten:", error));
    }, []);

    useEffect(() => {
        if (!data || !selectedParkhaus) return;

        const labels = data.map(row => row["Datum und Uhrzeit"]);
        const values = data.map(row => parseFloat(row[selectedParkhaus] || 0));

        setChartData({
            labels,
            datasets: [
                {
                    label: `Freie Parkplätze: ${selectedParkhaus}`,
                    data: values,
                    borderColor: "#2d7d9f",
                    backgroundColor: "rgba(45, 125, 159, 0.2)",
                },
            ],
        });
    }, [data, selectedParkhaus]);
    
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

    return (
        <Flex direction="column" height="100vh" width="100%">
            {/* Auswahlfeld */}
            <Box padding="2">
                <Select value={selectedParkhaus} onChange={e => setSelectedParkhaus(e.target.value)} width="300px" marginBottom="4">
                    {data && Object.keys(data[0]).filter(key => key !== "Datum und Uhrzeit").map(parkhaus => (
                        <option key={parkhaus} value={parkhaus}>{parkhaus}</option>
                    ))}
                </Select>
            </Box>

            {/* Diagramm-Container mit flexibler Höhe */}
            <Flex flex="1" padding="2" overflow="hidden" height="auto">
                <Box backgroundColor="white" borderWidth="1px" borderRadius="lg" boxShadow="lg" padding="4" width="100%" height="100%">
                    <Text fontSize="2xl" fontWeight="bold" marginBottom="4">Parkhaus-Belegung</Text>
                    {chartData ? <Line data={chartData} /> : <Text>Lade Daten...</Text>}
                </Box>
            </Flex>
        </Flex>
    );
}

