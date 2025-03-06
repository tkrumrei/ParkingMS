import { Box, Flex, Table, Thead, Tr, Th, Tbody, Td, Text, Button, Select } from "@open-pioneer/chakra-integration";
import { MapAnchor, MapContainer, useMapModel } from "@open-pioneer/map";
import { MAP_ID } from "./services";
import { useEffect, useState } from "react";
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
import { set } from "ol/transform";
import { AnalysisPage } from "./AnalysisPage";
import { ForecastingPage } from "./ForecastingPage";

export function MapApp() {

    const intl = useIntl();
    const { map } = useMapModel(MAP_ID);
    const [mode, setMode] = useState("Analysis");
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [liveData, setLiveData] = useState<any[]>([]);
    const [expandedRow, setExpandedRow] = useState<number | null>(null); // Zustand für die ausgeklappte Zeile
    const [initialView, setInitialView] = useState<{ center: [number, number]; zoom: number } | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);


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
            const response = await fetch("./data/parkhaeuser.geojson");
            if (!response.ok) {
                throw new Error(`Error fetching data: ${response.statusText}`);
            }

            let data = await response.json();

            // Füge das neue Attribut `NAME_NORMALIZED` hinzu
            data = addNormalizedNamesToGeoJson(data);

            // Speichere die bereinigten GeoJSON-Daten
            setGeoJsonData(data);

            // Aktualisierungszeit setzen
            const currentTime = new Date();
            setLastUpdated(currentTime.toLocaleString("de-DE"));
        } catch (error) {
            console.error("Failed to fetch GeoJSON data:", error);
        }
    };



    const normalizeText = (text: string | null): string => {
        if (!text) return "";
        return text
            .replace(/ß/g, "") // Entferne "ß"
            .replace(/ü/g, "") // Entferne "ü"
            .replace(/ö/g, "") // Entferne "ö"
            .replace(/ä/g, "") // Entferne "ä"
    };

    const addNormalizedNamesToGeoJson = (geoJsonData: any) => {
        const updatedGeoJson = {
            ...geoJsonData,
            features: geoJsonData.features.map((feature) => ({
                ...feature,
                properties: {
                    ...feature.properties,
                    NAME_NORMALIZED: normalizeText(feature.properties.NAME), // Neues Attribut mit bereinigtem Namen
                },
            })),
        };
        return updatedGeoJson;
    };


    const fetchXmlData = async () => {
        try {
            const response = await fetch("https://parkingms-ol01.onrender.com/api/parking-data");
            if (!response.ok) {
                throw new Error(`Error fetching API: ${response.statusText}`);
            }

            const data = await response.json();

            // Falls notwendig, bereinige die Namen
            const cleanedData = data.map((item) => ({
                ...item,
                bezeichnung: sanitizeText(item.bezeichnung),
            }));

            setLiveData(cleanedData);
        } catch (error) {
            console.error("API-Fehler:", error);
        }
    };

    function sanitizeText(text: string | null | undefined): string {
        if (!text) return "";
        return text
            .replace(/�/g, "") // Ersetze falsch dargestellte Zeichen
    }

    useEffect(() => {
        fetchGeoJson();
        fetchXmlData();
    }, []);

    useEffect(() => {
        if (geoJsonData && liveData) {

            const updatedGeoJsonData = {
                ...geoJsonData,
                features: geoJsonData.features.map((feature) => {
                    const normalizedFeatureName = feature.properties.NAME_NORMALIZED;

                    // Bereinige auch den `bezeichnung`-Wert aus `liveData`
                    const parkhaus = liveData.find(
                        (item) => item.bezeichnung === normalizedFeatureName
                    );

                    if (parkhaus) {
                        return {
                            ...feature,
                            properties: {
                                ...feature.properties, // Behalte bestehende Eigenschaften bei
                                parkingTotal: parkhaus.gesamt,
                                parkingFree: parkhaus.frei,
                                status: parkhaus.status,
                            },
                        };
                    }

                    return feature; // Unverändert zurückgeben, wenn kein Match gefunden wird
                }),
            };

            // Verhindere Endlosschleife durch Vergleich
            if (JSON.stringify(geoJsonData) !== JSON.stringify(updatedGeoJsonData)) {
                setGeoJsonData(updatedGeoJsonData);
            }
        }
    }, [geoJsonData, liveData]);


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
            const extent = transformExtent(
                [7.602380686696091, 51.94791196358763, 7.652558291969784, 51.97782974576418],
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
                if (!features?.length) {
                    popupOverlay.setPosition(undefined);
                    return;
                }

                const feature = features[0];
                const coordinates = feature?.getGeometry().getCoordinates();
                const name = feature?.get("NAME") || feature?.get("NAME_NORMALIZED");
                const status = feature?.get("status");
                const parkingFree = feature?.get("parkingFree");
                const freePercentage = feature?.get("freePercentage") ? feature.get("freePercentage").toFixed(1) : "N/A";
                
                popupElement.innerHTML = `<strong>${name}</strong><br/>Status: ${status}<br/>Available Spots: ${parkingFree}<br/>Free in %: ${freePercentage}`;
                popupOverlay.setPosition(coordinates);
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
        <Flex direction="column" height="100vh" width="100%">
            {/* Navbar */}
            <Box backgroundColor="#2d7d9f" padding="4" color="white" boxShadow="lg" height="10%">
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
                        backgroundColor="#2d7d9f"
                        color="white"
                        fontSize="2xl"
                        fontWeight="bold"
                        border="none"
                        boxShadow="md"
                        _focus={{ outline: "none" }}
                        _hover={{ backgroundColor: "blue.500" }}
                        value={mode}
                        onChange={(e) => setMode(e.target.value)}
                        zIndex={10} 
                    >
                        <option
                            value="Analysis"
                            style={{
                                fontSize: "1rem",
                                padding: "10px",
                                backgroundColor: "white",
                                color: "black",
                            }}
                        >
                            Analysis
                        </option>
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
            <Flex flex="1" direction="column" overflow="hidden" height="80%">
                {mode === "Live Tracking" ? (
                    <Flex flex="1" direction="row" overflow="hidden" padding="2" gap={2}>
                        {/* Left Section */}
                        <Flex direction="column" width="60%" overflow="hidden"  height="100%">
                            {/* Text über der Karte */}
                            <Flex justifyContent="flex-end" backgroundColor="white" boxShadow="sm" borderTopRadius="lg">
                                <Text fontSize="md" color="gray.600" textAlign="center">
                                    {lastUpdated ? `Last updated: ${lastUpdated}` : "Loading data..."}
                                </Text>
                                {/* Refresh button */}
                                <Button
                                    onClick={fetchGeoJson} // Function to refresh data
                                    backgroundColor="white" // Set background to white
                                    color="#3182CE" // Blue icon color
                                    borderRadius="50%" // Rounded button
                                    width="30px" // Equal width and height for a perfect circle
                                    height="30px"
                                    display="flex" // Ensures proper centering of the icon
                                    alignItems="center"
                                    justifyContent="center"
                                    padding="2"
                                    _hover={{
                                        backgroundColor: "#E3F2FD", // Light blue hover effect
                                        borderColor: "#3182CE",
                                    }}
                                    _active={{
                                        backgroundColor: "#BBDEFB", // Darker blue on click
                                        borderColor: "#3182CE",
                                    }}
                                    aria-label="Refresh"
                                >
                                    <svg width="39px" height="39px" viewBox="-24 -24 72.00 72.00" fill="none" xmlns="http://www.w3.org/2000/svg" transform="rotate(0)"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" stroke="#CCCCCC" strokeWidth="0.096"></g><g id="SVGRepo_iconCarrier"> <path d="M3 3V8M3 8H8M3 8L6 5.29168C7.59227 3.86656 9.69494 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.71683 21 4.13247 18.008 3.22302 14" stroke="#3182CE" strokeWidth="1.8240000000000003" strokeLinecap="round" strokeLinejoin="round"></path> </g></svg>
                                </Button>

                            </Flex>
                            {/* Map Section */}
                            <Box
                                backgroundColor="white"
                                borderWidth="1px"
                                borderBottomRadius="lg"
                                boxShadow="lg"
                                overflow="hidden"
                                flex="1"
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
                                                backgroundColor="#2d7d9f"
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
                        <Flex direction="column" width="40%" overflow="hidden">
                            {/* Table Section */}
                            <Box
                                backgroundColor="white"
                                borderWidth="1px"
                                borderRadius="lg"
                                boxShadow="lg"
                                flex="3"
                                overflowY="auto"
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
                                            .sort((a, b) => b.free - a.free)
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
                ) : mode === "Forecasting" ? (
                    <Flex flex="1" direction="column" overflow="hidden" height="80%">
                        <ForecastingPage />
                    </Flex>
                ) : mode === "Analysis" ? (
                    <Flex flex="1" direction="column" overflow="hidden">
                        <AnalysisPage />
                    </Flex>
                ): null }
            </Flex>
            {/* Footer */}
            <Flex
                height="7%"
                textAlign="center"
                backgroundColor="#2d7d9f"
                color="white"
                boxShadow="lg"
                alignItems="center"
                justifyContent="center" 
                flexDirection="column"
            >
                <Text>© 2025 ParkingMS. All Rights Reserved.</Text>
                <Text>Developed for the AOSD seminar project.</Text>
            </Flex>
        </Flex>
    );
}
