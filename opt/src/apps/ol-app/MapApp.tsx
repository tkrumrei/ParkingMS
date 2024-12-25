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
import { transformExtent } from "ol/proj";

export function MapApp() {

    const intl = useIntl();
    const { map } = useMapModel(MAP_ID);
    const [mode, setMode] = useState("Live Tracking");
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [expandedRow, setExpandedRow] = useState<number | null>(null); // Zustand für die ausgeklappte Zeile
    const [initialView, setInitialView] = useState<{ center: [number, number]; zoom: number } | null>(null);


    const handleRowExpand = (index: number, coordinates: any) => {
        if (expandedRow === index) {
            // Zeile schließen und auf Anfangsansicht zurücksetzen
            setExpandedRow(null);
            if (initialView && map?.olMap) {
                map.olMap.getView().animate({
                    center: initialView.center,
                    zoom: initialView.zoom,
                    duration: 500, // Animation über 0.5 Sekunde
                });
            }
        } else {
            // Zeile öffnen und Karte auf Marker zoomen
            setExpandedRow(index);
            if (coordinates && map?.olMap) {
                map.olMap.getView().animate({
                    center: coordinates,
                    zoom: 17, // Zoomen auf einen sinnvollen Maßstab
                    duration: 500, // Animation über 0.5 Sekunde
                });
            }
        }
    };

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

        } catch (error) {
            console.error("Failed to fetch GeoJSON data:", error);
        }
    };

    useEffect(() => {
        fetchGeoJson(); // API-Aufruf beim Laden der Komponente
    }, []);

    useEffect(() => {
        const headerElement = document.querySelector("header"); // Adjust selector as needed
        const footerElement = document.querySelector("footer");

        const headerHeight = headerElement?.offsetHeight || 0;
        const footerHeight = footerElement?.offsetHeight || 0;

        const mapHeight = window.innerHeight - headerHeight - footerHeight;

        // Apply the calculated height to your map
        const mapElement = document.getElementById("mapContainer");
        if (mapElement) {
            mapElement.style.height = `${mapHeight}px`;
        }
    }, []);

    useEffect(() => {
        if (map?.layers && geoJsonData) {
            // GeoJSON-Datenquelle aus public/data/liveData.geojson laden
            const extent = transformExtent(
                [7.60416153295933, 51.9508596684052, 7.652558291969784, 51.97782974576418],
                "EPSG:4326",
                "EPSG:3857"
            );

            const view = map.olMap.getView();
            view.fit(extent, { maxZoom: 16 });


            setInitialView({
                center: view.getCenter() as [number, number],
                zoom: view.getZoom() || 10, // Fallback-Zoomstufe
            });

            // Filter: Nur Features innerhalb des Extents
            const vectorSource = new VectorSource({
                features: new GeoJSON().readFeatures(geoJsonData, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                }),
            });

            const filteredFeatures = vectorSource.getFeatures().filter((feature) => {
                const coordinates = feature?.getGeometry().getCoordinates();
                return coordinates[0] >= extent[0] && coordinates[0] <= extent[2] && // Längengrad prüfen
                    coordinates[1] >= extent[1] && coordinates[1] <= extent[3];  // Breitengrad prüfen
            });

            const tableEntries = filteredFeatures.map((feature) => {
                const free = feature.get("parkingFree");
                const total = feature.get("parkingTotal");

                // Berechnung der Auslastung in Prozent
                const freePercentage = total > 0 ? (free / total) * 100 : 0;

                feature.set("freePercentage", freePercentage)

                return {
                    name: feature.get("NAME"),
                    status: feature.get("status"),
                    total: total,
                    free: free,
                    freePercentage: freePercentage.toFixed(1), // Auf eine Nachkommastelle runden
                    coordinates: feature.getGeometry().getCoordinates(),
                };
            });
            setTableData(tableEntries);

            // Quelle mit gefilterten Features
            const filteredSource = new VectorSource({
                features: filteredFeatures,
            });

            // Dynamischer Style basierend auf dem Status
            const markerStyle = (feature: FeatureLike) => {
                const freePercentage = feature.get("freePercentage");
                let color;

                // Farbe basierend auf dem Prozentsatz bestimmen
                if (freePercentage > 50) {
                    color = "lime"; // Mehr als 50% frei
                } else if (freePercentage > 10 && freePercentage <= 50) {
                    color = "yellow"; // Zwischen 5% und 50% frei
                } else if (freePercentage > 0.01 && freePercentage <= 10) {
                    color = "red"; // Weniger als 5% frei
                } else {
                    color = "grey"; // Standardfarbe, falls Prozentsatz nicht verfügbar
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
                source: filteredSource,
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
                    const parkingFree = feature?.get("parkingFree");
                    const freePercentage = feature?.get("freePercentage").toFixed(1);

                    // Popup anzeigen
                    popupElement.innerHTML = `
            <strong>${name}</strong><br/>
            Status: ${status}<br/>
            Available Spots: ${parkingFree}<br/>
            Free in %: ${freePercentage}
        `;
                    popupOverlay.setPosition(coordinates);

                    // Passenden Tabelleneintrag ausklappen
                    const rowIndex = tableData.findIndex((row) => row.name === name);
                    if (rowIndex !== -1) {
                        setExpandedRow(rowIndex);
                    }
                } else {
                    popupOverlay.setPosition(undefined); // Popup schließen
                    setExpandedRow(null); // Keine Zeile ausgeklappt
                }
            });


            filteredSource.once("featuresloadend", () => {
                const extent = filteredSource.getExtent();
                map.olMap.getView().fit(extent, { padding: [50, 50, 50, 50] });
                const features = filteredSource.getFeatures();
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
            <Flex flex="1" direction="column" overflow="hidden">
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
                                marginBottom="4"
                            >
                                <MapContainer
                                    mapId={MAP_ID}
                                    id="mapcontainer"
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
                                                backgroundColor="yellow"
                                                marginRight="8px"
                                                borderRadius="50%"
                                            ></Box>
                                            <Text>Half Occupied</Text>
                                        </Flex>
                                        <Flex alignItems="center" marginBottom="2">
                                            <Box
                                                width="16px"
                                                height="16px"
                                                backgroundColor="red"
                                                marginRight="8px"
                                                borderRadius="50%"
                                            ></Box>
                                            <Text>Almost Occupied</Text>
                                        </Flex>
                                        <Flex alignItems="center">
                                            <Box
                                                width="16px"
                                                height="16px"
                                                backgroundColor="grey"
                                                marginRight="8px"
                                                borderRadius="50%"
                                            ></Box>
                                            <Text>Not Available</Text>
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
                                            <Button
                                                onClick={() => {
                                                    if (map?.olMap) {
                                                        const view = map.olMap.getView();
                                                        const initialExtent = transformExtent(
                                                            [7.60416153295933, 51.9508596684052, 7.652558291969784, 51.97782974576418], // Beispiel-Extent
                                                            "EPSG:4326",
                                                            "EPSG:3857"
                                                        );
                                                        view.fit(initialExtent, { maxZoom: 16 });
                                                    }
                                                }}
                                                backgroundColor="blue.500"
                                                color="white"
                                                borderRadius="md"
                                                boxShadow="md"
                                                width="40px"
                                                height="40px"
                                                display="flex"
                                                alignItems="center"
                                                justifyContent="center"
                                                _hover={{ backgroundColor: "blue.400" }}
                                                _active={{ backgroundColor: "blue.600" }}
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="currentColor"
                                                    viewBox="0 0 24 24"
                                                    style={{
                                                        fontSize: "28px", // Größe des Icons festlegen
                                                    }}
                                                >
                                                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                                                </svg>
                                            </Button>
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
                                            <Th>Parking Free</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {tableData
                                            .sort((a, b) => b.free - a.free) // Sortieren nach freien Parkplätzen
                                            .map((row, index) => (
                                                <>
                                                    <Tr
                                                        key={index}
                                                        onClick={() => handleRowExpand(index, row.coordinates)} // Zeile anklickbar und Karte zoomen
                                                        style={{
                                                            cursor: "pointer",
                                                            backgroundColor: expandedRow === index ? "#e9ecef" : "#f9f9f9",
                                                        }} // Hintergrundfarbe bei Auswahl ändern
                                                        _hover={{ backgroundColor: "#d6d6d6" }}
                                                    >
                                                        <Td>{row.name}</Td>
                                                        <Td>{row.status}</Td>
                                                        <Td>{row.free}</Td>
                                                    </Tr>
                                                    {expandedRow === index && (
                                                        <Tr>
                                                            <Td colSpan={5} style={{ backgroundColor: "#f1f1f1", padding: "10px" }}>
                                                                <Text><strong>Free (%):</strong> {row.freePercentage}</Text>
                                                                <Text><strong>Parking Total:</strong> {row.total}</Text>
                                                                <Text><strong>Parking Free:</strong> {row.free}</Text>
                                                            </Td>
                                                        </Tr>
                                                    )}
                                                </>
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