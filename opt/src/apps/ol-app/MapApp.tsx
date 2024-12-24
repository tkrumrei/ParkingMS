import { Box, Flex, Table, Thead, Tr, Th, Tbody, Td, Text, Button, Select } from "@open-pioneer/chakra-integration";
import { MapAnchor, MapContainer, useMapModel } from "@open-pioneer/map";
import { MAP_ID } from "./services";
import React, { useEffect, useState } from "react";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector.js";
import GeoJSON from "ol/format/GeoJSON";
import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import { FeatureLike } from "ol/Feature";
import Overlay from "ol/Overlay";
import { Geolocation } from "@open-pioneer/geolocation";
import { InitialExtent, ZoomIn, ZoomOut } from "@open-pioneer/map-navigation";
import { useIntl } from "open-pioneer:react-hooks";

export function MapApp() {

    const intl = useIntl();
    const { map } = useMapModel(MAP_ID);
    const [mode, setMode] = useState("Live Tracking");
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [tableData, setTableData] = useState<any[]>([]);

    // Funktion zum Laden der GeoJSON-Daten von der API
    const fetchGeoJson = async () => {
        try {
            const response = await fetch("https://api.dashboard.smartcity.ms/parking");
            if (!response.ok) {
                throw new Error(`Error fetching data: ${response.statusText}`);
            }
            const data = await response.json();

            // GeoJSON-Daten speichern
            setGeoJsonData(data);

            // Tabellendaten aus GeoJSON extrahieren
            const tableEntries = data.features.map((feature: any) => ({
                name: feature.properties.NAME,
                status: feature.properties.status,
                total: feature.properties.parkingTotal,
                free: feature.properties.parkingFree,
                coordinates: feature.geometry.coordinates,
            }));
            setTableData(tableEntries);
        } catch (error) {
            console.error("Failed to fetch GeoJSON data:", error);
        }
    };

    useEffect(() => {
        fetchGeoJson(); // API-Aufruf beim Laden der Komponente
    }, []);

    useEffect(() => {
        if (map?.layers && geoJsonData) {
            // GeoJSON-Datenquelle aus public/data/liveData.geojson laden
            const vectorSource = new VectorSource({
                features: new GeoJSON().readFeatures(geoJsonData, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                }),
            });

            // Dynamischer Style basierend auf dem Status
            const markerStyle = (feature: FeatureLike) => {
                const status = feature.get("status"); // Status aus den Eigenschaften
                let color;

                if (status === "frei") {
                    color =
                        "lime"; // Grünes Icon
                } else if (status === "besetzt" || status === "geschlossen") {
                    color =
                        "red"; // Rotes Icon
                } else {
                    color = "grey"; // Standard-Icon
                }

                return new Style({
                    image: new Icon({
                        src: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
                        scale: 0.8, // Größe des Icons
                        anchor: [0.5, 1],  // Spitze des Icons zeigt auf den Punkt
                        color: color,
                    }),
                });
            };

            // GeoJSON-Layer mit dynamischem Style erstellen
            const geojsonLayer = new VectorLayer({
                source: vectorSource,
                style: markerStyle,
            });

            // Layer zur Karte hinzufügen
            map.olMap.addLayer(geojsonLayer);

            // Popup-Overlay erstellen
            const popupElement = document.createElement("div");
            popupElement.id = "popup";
            popupElement.style.backgroundColor = "white";
            popupElement.style.padding = "10px";
            popupElement.style.borderRadius = "5px";
            popupElement.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.2)";
            const popupOverlay = new Overlay({
                element: popupElement,
            });

            map.olMap.addOverlay(popupOverlay);

            // Marker-Klick-Event hinzufügen
            map.olMap.on("click", (event) => {
                const features = map.olMap.getFeaturesAtPixel(event.pixel);
                if (features?.length) {
                    const feature = features[0];
                    const coordinates = feature?.getGeometry().getCoordinates();
                    const name = feature?.get("NAME");
                    const status = feature?.get("status");
                    const parkingFree = feature?.get("parkingFree")

                    popupElement.innerHTML = `
                        <strong>${name}</strong><br/>
                        Status: ${status}<br/>
                        Available Spots: ${parkingFree}
                    `;
                    popupOverlay.setPosition(coordinates);
                } else {
                    popupOverlay.setPosition(undefined); // Popup schließen
                }
            });


            vectorSource.once("featuresloadend", () => {
                const extent = vectorSource.getExtent();
                map.olMap.getView().fit(extent, { padding: [50, 50, 50, 50] });
                const features = vectorSource.getFeatures();
                const data = features.map((feature) => ({
                    name: feature.get("NAME"),
                    status: feature.get("status"),
                    total: feature.get("parkingTotal"),
                    free: feature.get("parkingFree"),
                    coordinates: feature?.getGeometry().getCoordinates(),
                }));
                setTableData(data);
            });
        }
    }, [map, geoJsonData]);

    const handleRowClick = (coordinates: any) => {
        if (map?.olMap) {
            map.olMap.getView().animate({
                center: coordinates,
                zoom: 17, // Zoomen auf einen sinnvollen Maßstab
                duration: 500, // Animation über 0.5 Sekunde
            });
        }
    };

    return (
        <Flex direction="column" minHeight="100vh" width="100%">
            {/* Navbar */}
            <Box backgroundColor="blue.500" padding="4" color="white" boxShadow="lg">
                <Flex justifyContent="space-between" alignItems="center">
                    {/* Left: Logo and Title */}
                    <Flex alignItems="center" gap="3">
                        <Box>
                            <img
                                src={"./img/icon_ParkingMS.png"}
                                alt="ParkingMS Logo"
                                style={{ height: "50px", width: "50px", borderRadius: "50%" }}
                            />
                        </Box>
                        <Text fontSize="2xl" fontWeight="bold">
                            ParkingMS
                        </Text>
                    </Flex>

                    {/* Center: Dropdown */}
                    <Select
                        width="200px"
                        backgroundColor="blue.400"
                        color="white"
                        fontSize="2xl"
                        fontWeight="bold"
                        border="none"
                        boxShadow="md"
                        _focus={{ outline: "none" }}
                        _hover={{ backgroundColor: "blue.500" }}
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        zIndex={10} // Stellt sicher, dass das Dropdown über anderen Elementen liegt
                    >
                        <option
                            value="Live Tracking"
                            style={{
                                fontSize: "1rem",
                                padding: "10px",
                                backgroundColor: "white",
                                color: "black",
                            }}
                        >
                            Live Tracking
                        </option>
                        <option
                            value="Forecasting"
                            style={{
                                fontSize: "1rem",
                                padding: "10px",
                                backgroundColor: "white",
                                color: "black",
                            }}
                        >
                            Forecasting
                        </option>
                    </Select>


                    {/* Right: Navigation Links */}
                    <Flex gap="4" alignItems="center">
                        <Button variant="ghost" color="white">
                            About
                        </Button>
                        <Button variant="ghost" color="white">
                            Contact
                        </Button>
                    </Flex>
                </Flex>
            </Box>

            {/* Hauptinhalt */}
            <Flex flex="1" direction="column" overflowY="auto">
                {mode === "Live Tracking" ? (
                    <Flex flex="1" direction="row" overflow="hidden">
                        {/* Left Section */}
                        <Flex direction="column" width="60%" overflow="hidden" padding="3">
                            {/* Map Section */}
                            <Box
                                backgroundColor="white"
                                borderWidth="1px"
                                borderRadius="lg"
                                boxShadow="lg"
                                overflow="hidden"
                                flex="1"
                                height="600px"
                                marginBottom="4"
                            >
                                <MapContainer
                                    mapId={MAP_ID}
                                    role="main"
                                    aria-label="Interactive Parking Map"
                                >
                                    {/* Legende hinzufügen */}
                                    <Box
                                        position="absolute"
                                        top="20px"
                                        left="20px"
                                        backgroundColor="white"
                                        padding="10px"
                                        borderRadius="8px"
                                        boxShadow="md"
                                        zIndex="10"
                                        opacity="0.7"
                                    >
                                        <Text fontWeight="bold" marginBottom="4">
                                            Legend
                                        </Text>
                                        <Flex alignItems="center" marginBottom="2">
                                            <Box
                                                width="16px"
                                                height="16px"
                                                backgroundColor="lime"
                                                marginRight="8px"
                                                borderRadius="50%"
                                            ></Box>
                                            <Text>Free</Text>
                                        </Flex>
                                        <Flex alignItems="center" marginBottom="2">
                                            <Box
                                                width="16px"
                                                height="16px"
                                                backgroundColor="red"
                                                marginRight="8px"
                                                borderRadius="50%"
                                            ></Box>
                                            <Text>Occupied</Text>
                                        </Flex>
                                        <Flex alignItems="center">
                                            <Box
                                                width="16px"
                                                height="16px"
                                                backgroundColor="grey"
                                                marginRight="8px"
                                                borderRadius="50%"
                                            ></Box>
                                            <Text>Closed</Text>
                                        </Flex>
                                    </Box>
                                    {/* Karte */}
                                    <MapAnchor position="top-left" horizontalGap={5} verticalGap={5} />
                                    {/* Buttons Karte */}
                                    <MapAnchor position="top-right" horizontalGap={10} verticalGap={30}>
                                        <Flex
                                            role="bottom-right"
                                            aria-label={intl.formatMessage({ id: "ariaLabel.bottomRight" })}
                                            direction="column"
                                            gap={1}
                                            padding={1}
                                        >
                                            <Geolocation mapId={MAP_ID} />
                                            <InitialExtent mapId={MAP_ID} />
                                            <ZoomIn mapId={MAP_ID} />
                                            <ZoomOut mapId={MAP_ID} />
                                        </Flex>
                                    </MapAnchor>
                                </MapContainer>
                            </Box>
                        </Flex>

                        {/* Right Section */}
                        <Flex direction="column" width="40%" overflow="hidden" padding="3">
                            {/* Table Section */}
                            <Box
                                backgroundColor="white"
                                borderWidth="1px"
                                borderRadius="lg"
                                boxShadow="lg"
                                flex="3"
                                padding="4"
                                overflowY="auto"
                                height="400px" // Zusätzliche Höhe für Scrollbarkeit
                            >
                                <Table variant="simple">
                                    <Thead>
                                        <Tr>
                                            <Th>Parking Facility</Th>
                                            <Th>Status</Th>
                                            <Th>Total Capacity</Th>
                                            <Th>Free Spaces</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {tableData
                                            .sort((a, b) => b.free - a.free) // Sortieren nach freien Parkplätzen
                                            .map((row, index) => (
                                                <Tr
                                                    key={index}
                                                    onClick={() => handleRowClick(row.coordinates)} // Zeile anklickbar machen
                                                    style={{ cursor: "pointer", backgroundColor: "#f9f9f9" }} // Cursor und Hover-Stil
                                                    _hover={{ backgroundColor: "#e9ecef" }}
                                                >
                                                    <Td>{row.name}</Td>
                                                    <Td>{row.status}</Td>
                                                    <Td>{row.total}</Td>
                                                    <Td>{row.free}</Td>
                                                </Tr>
                                            ))}
                                    </Tbody>
                                </Table>
                            </Box>
                        </Flex>
                    </Flex>
                ) : (
                    <Flex flex="1" direction="column" padding="4">
                        <Box
                            backgroundColor="white"
                            borderWidth="1px"
                            borderRadius="lg"
                            boxShadow="lg"
                            padding="4"
                            flex="1"
                        >
                            <Text fontSize="2xl" fontWeight="bold">
                                Forecasting Data
                            </Text>
                            <p>This is where your forecasting content will go.</p>
                        </Box>
                    </Flex>
                )}
            </Flex>

            {/* Footer */}
            <Box
                backgroundColor="blue.500"
                color="white"
                padding="4"
                textAlign="center"
                boxShadow="lg"
                marginTop="auto"
            >
                <Text>© 2023 ParkingMS. All Rights Reserved.</Text>
                <Text>Developed for the AOSD seminar project.</Text>
            </Box>
        </Flex>
    );
}