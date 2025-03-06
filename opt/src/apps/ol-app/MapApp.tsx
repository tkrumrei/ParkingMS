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
import { renderToStaticMarkup } from "react-dom/server";
import { FaMapMarkerAlt } from "react-icons/fa";

function createMarkerIcon(color: string, sizePx: number = 24): string {
    const iconSvg = renderToStaticMarkup(
        <FaMapMarkerAlt style={{ color, fontSize: `${sizePx}px` }} />
    );
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(iconSvg);
}

export function MapApp() {
    const intl = useIntl();
    const { map } = useMapModel(MAP_ID);
    const [mode, setMode] = useState("Analysis");
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [liveData, setLiveData] = useState<any[]>([]);
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [initialView, setInitialView] = useState<{ center: [number, number]; zoom: number } | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [forecastDiffs, setForecastDiffs] = useState<any>(null);

    // Funktion zum Laden der CSV mit den Differenzwerten
    const fetchForecastData = async () => {
        try {
            const response = await fetch("./data/average_Parkhausdaten_week.csv");
            if (!response.ok) {
                throw new Error(`Error fetching forecast data: ${response.statusText}`);
            }

            const text = await response.text();

            // Jede Zeile splitten und Zellen bereinigen
            const lines = text.split("\n").map((line) => {
                const columns = line.split(",");
                return columns.map((cell) =>
                    cell
                        .replace(/"/g, "")      // alle doppelten Anführungszeichen weg
                        .replace(/\r/g, "")     // \r weg
                        .replace(/\n/g, "")     // sicherheitshalber \n weg
                        .trim()
                );
            });
            const header = lines[0];

            // Index der Spalten "Wochentag" und "Uhrzeit" finden
            const dayIndex = header.indexOf("Wochentag");
            const timeIndex = header.indexOf("Uhrzeit");
            if (dayIndex < 0 || timeIndex < 0) {
                console.error("Konnte Spalten 'Wochentag' bzw. 'Uhrzeit' nicht finden!");
                return;
            }

            // Ermitteln, welche Spalten _Diff sind
            const diffColumns = header.filter((h) => h.endsWith("_Diff"));

            const forecastMap: any = {};

            // Durch die Datenzeilen iterieren (Start ab i=1, weil i=0 -> Header)
            for (let i = 1; i < lines.length; i++) {
                const row = lines[i];
                if (!row || row.length <= timeIndex) continue;

                // Lies den Wochentag & die Uhrzeit aus den richtigen Spalten:
                const day = row[dayIndex];
                const time = row[timeIndex];
                if (!day || !time) continue;

                if (!forecastMap[day]) {
                    forecastMap[day] = {};
                }
                if (!forecastMap[day][time]) {
                    forecastMap[day][time] = {};
                }

                // Jetzt alle Diff-Spalten auswerten
                diffColumns.forEach((colName) => {
                    const colPos = header.indexOf(colName);
                    if (colPos < 0) return;

                    const rawVal = row[colPos];
                    const val = parseInt(rawVal, 10) || 0;

                    // Spaltenname "PH Theater_Diff" -> Parkhausname "PH Theater"
                    const parkhausName = colName.replace(/_Diff$/, "").trim();
                    forecastMap[day][time][parkhausName] = val;
                });
            }

            setForecastDiffs(forecastMap);
        } catch (error) {
            console.error("Failed to fetch forecast data:", error);
        }
    };

    function applyForecastToTableData() {
        if (!forecastDiffs || !tableData || tableData.length === 0) {
            return;
        }

        const nameMap = { /* ... */ };
        const now = new Date();
        const day = now.toLocaleString("en-US", { weekday: "long" });
        const [time1, time2] = getNextTwoQuarterHours();

        let changed = false; // Merker, ob sich überhaupt etwas ändert
        const updatedData = tableData.map((row) => {
            const csvName = nameMap[row.name] || row.name;

            let diff1 = 0, diff2 = 0;
            if (forecastDiffs[day]?.[time1]?.[csvName]) {
                diff1 = forecastDiffs[day][time1][csvName];
            }
            if (forecastDiffs[day]?.[time2]?.[csvName]) {
                diff2 = forecastDiffs[day][time2][csvName];
            }

            const plus30 = Math.max(0, (row.free || 0) + diff1 + diff2);

            // Prüfen, ob sich plus30 ändert
            if (plus30 !== row.plus30) {
                changed = true;
                // Nur diese Zeile mit neuem Wert
                return { ...row, plus30 };
            } else {
                // Falls identisch, unverändert zurückgeben
                return row;
            }
        });

        // Nur wenn wirklich etwas anders ist, setzten wir tableData neu
        if (changed) {
            setTableData(updatedData);
        }
    }


    function getNextTwoQuarterHours() {
        const now = new Date();

        // 1) Reste auf die nächste Viertelstunde hochrunden
        let nextTime1 = new Date(now);
        const remainder = nextTime1.getMinutes() % 15;
        if (remainder !== 0) {
            nextTime1.setMinutes(nextTime1.getMinutes() + (15 - remainder));
        } else {
            // Falls remainder == 0, dann springe direkt +15 Minuten weiter
            nextTime1.setMinutes(nextTime1.getMinutes() + 15);
        }
        nextTime1.setSeconds(0);
        nextTime1.setMilliseconds(0);

        // 2) Für das zweite Intervall nochmals 15 Minuten drauf
        let nextTime2 = new Date(nextTime1);
        nextTime2.setMinutes(nextTime2.getMinutes() + 15);

        // 3) Beide Zeiten als 'HH:MM:SS' zurückgeben
        const timeStr1 = nextTime1.toTimeString().slice(0, 5) + ":00";
        const timeStr2 = nextTime2.toTimeString().slice(0, 5) + ":00";

        return [timeStr1, timeStr2];
    }

    // fetchGeoJson & fetchXmlData beim Mount
    useEffect(() => {
        fetchGeoJson();
        fetchXmlData();
        fetchForecastData(); // Forecast CSV auch laden
    }, []);

    // Sobald tableData oder forecastDiffs sich ändern, Prognose anwenden.
    useEffect(() => {
        applyForecastToTableData();
    }, [tableData, forecastDiffs]);

    const handleRowExpand = (index: number, coordinates: any) => {
        if (expandedRow === index) {
            // Zeile schließen und auf Anfangsansicht zurücksetzen
            setExpandedRow(null);
            if (initialView && map?.olMap) {
                map.olMap.getView().animate({
                    center: initialView.center,
                    zoom: initialView.zoom,
                    duration: 500,
                });
            }
        } else {
            // Zeile öffnen und Karte auf Marker zoomen
            setExpandedRow(index);
            if (coordinates && map?.olMap) {
                map.olMap.getView().animate({
                    center: coordinates,
                    zoom: 17,
                    duration: 500,
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
            .replace(/ß/g, "")
            .replace(/ü/g, "")
            .replace(/ö/g, "")
            .replace(/ä/g, "");
    };

    const addNormalizedNamesToGeoJson = (geoJsonData: any) => {
        const updatedGeoJson = {
            ...geoJsonData,
            features: geoJsonData.features.map((feature: any) => ({
                ...feature,
                properties: {
                    ...feature.properties,
                    NAME_NORMALIZED: normalizeText(feature.properties.NAME),
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
            const cleanedData = data.map((item: any) => ({
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
        return text.replace(/�/g, "");
    }

    useEffect(() => {
        if (geoJsonData && liveData) {
            const updatedGeoJsonData = {
                ...geoJsonData,
                features: geoJsonData.features.map((feature: any) => {
                    const normalizedFeatureName = feature.properties.NAME_NORMALIZED;

                    // Bereinige auch den `bezeichnung`-Wert aus `liveData`
                    const parkhaus = liveData.find(
                        (item: any) => item.bezeichnung === normalizedFeatureName
                    );

                    if (parkhaus) {
                        return {
                            ...feature,
                            properties: {
                                ...feature.properties,
                                parkingTotal: parkhaus.gesamt,
                                parkingFree: parkhaus.frei,
                                status: parkhaus.status,
                            },
                        };
                    }

                    return feature;
                }),
            };

            if (JSON.stringify(geoJsonData) !== JSON.stringify(updatedGeoJsonData)) {
                setGeoJsonData(updatedGeoJsonData);
            }
        }
    }, [geoJsonData, liveData]);

    useEffect(() => {
        const headerElement = document.querySelector("header");
        const footerElement = document.querySelector("footer");

        const headerHeight = headerElement?.offsetHeight || 0;
        const footerHeight = footerElement?.offsetHeight || 0;

        const mapHeight = window.innerHeight - headerHeight - footerHeight;

        const mapElement = document.getElementById("mapContainer");
        if (mapElement) {
            mapElement.style.height = `${mapHeight}px`;
        }
    }, []);

    useEffect(() => {
        if (map?.olMap && mode === "Live Tracking") {
            const view = map.olMap.getView();
            const initialExtent = transformExtent(
                [7.60416153295933, 51.9508596684052, 7.652558291969784, 51.97782974576418],
                "EPSG:4326",
                "EPSG:3857"
            );
            view.fit(initialExtent, { maxZoom: 16 });
        }
    }, [map, mode]);

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
                zoom: view.getZoom() || 16,
            });

            const vectorSource = new VectorSource({
                features: new GeoJSON().readFeatures(geoJsonData, {
                    dataProjection: "EPSG:4326",
                    featureProjection: "EPSG:3857",
                }),
            });

            const filteredFeatures = vectorSource.getFeatures().filter((feature) => {
                const coordinates = feature?.getGeometry().getCoordinates();
                return (
                    coordinates[0] >= extent[0] &&
                    coordinates[0] <= extent[2] &&
                    coordinates[1] >= extent[1] &&
                    coordinates[1] <= extent[3]
                );
            });

            const tableEntries = filteredFeatures.map((feature) => {
                const free = feature.get("parkingFree");
                const total = feature.get("parkingTotal");

                const freePercentage = total > 0 ? (free / total) * 100 : 0;
                feature.set("freePercentage", freePercentage);

                return {
                    name: feature.get("NAME"),
                    status: feature.get("status"),
                    total: total,
                    free: free,
                    freePercentage: freePercentage.toFixed(1),
                    coordinates: feature.getGeometry().getCoordinates(),
                };
            });
            setTableData(tableEntries);

            const filteredSource = new VectorSource({
                features: filteredFeatures,
            });

            // Hier bauen wir den Marker-Style mit react-icons
            const markerStyle = (feature: FeatureLike) => {
                const freePercentage = feature.get("freePercentage") || 0;
                let color = "grey";
                if (freePercentage > 50) {
                    color = "green";
                } else if (freePercentage > 10) {
                    color = "yellow";
                } else if (freePercentage > 0) {
                    color = "orange";
                } else if (freePercentage === 0) {
                    color = "darkred";
                }

                // Data-URL generieren
                const iconUrl = createMarkerIcon(color, 24);

                return new Style({
                    image: new Icon({
                        src: iconUrl,
                        anchor: [0.5, 1],
                        scale: 1,
                    }),
                });
            };

            const geojsonLayer = new VectorLayer({
                source: filteredSource,
                style: markerStyle,
            });

            map.olMap.addLayer(geojsonLayer);

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
                const freePercentage = feature?.get("freePercentage")
                    ? feature.get("freePercentage").toFixed(1)
                    : "N/A";

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
                                    onClick={fetchGeoJson}
                                    backgroundColor="white"
                                    color="#3182CE"
                                    borderRadius="50%"
                                    width="30px"
                                    height="30px"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    padding="2"
                                    _hover={{
                                        backgroundColor: "#E3F2FD",
                                        borderColor: "#3182CE",
                                    }}
                                    _active={{
                                        backgroundColor: "#BBDEFB",
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
                                    {/* Legende */}
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
                                                backgroundColor="green"
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
                                                backgroundColor="orange"
                                                marginRight="8px"
                                                borderRadius="50%"
                                            ></Box>
                                            <Text>Almost Occupied</Text>
                                        </Flex>
                                        <Flex alignItems="center" marginBottom="2">
                                            <Box
                                                width="16px"
                                                height="16px"
                                                backgroundColor="darkred"
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
                                                            [7.60416153295933, 51.9508596684052, 7.652558291969784, 51.97782974576418],
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
                                                        fontSize: "28px",
                                                    }}
                                                >
                                                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                                                </svg>
                                            </Button>
                                            <ZoomIn mapId={MAP_ID} />
                                            <ZoomOut mapId={MAP_ID} />
                                        </Flex>
                                    </MapAnchor>
                                    <MapAnchor position="bottom-left" verticalGap={1} horizontalGap={1}>
                                        <Box
                                            backgroundColor="white"
                                            borderRadius="sm"
                                            opacity="0.7"
                                            boxShadow="sm"
                                            fontSize="x-small"
                                            color="black"
                                        >
                                            Icons by Font Awesome (CC BY 4.0)
                                        </Box>
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
                                            <Th>+30min</Th>
                                        </Tr>
                                    </Thead>
                                    <Tbody>
                                        {tableData
                                            .sort((a, b) => b.free - a.free)
                                            .map((row, index) => (
                                                <>
                                                    <Tr
                                                        key={index}
                                                        onClick={() => handleRowExpand(index, row.coordinates)}
                                                        style={{
                                                            cursor: "pointer",
                                                            backgroundColor: expandedRow === index ? "#e9ecef" : "#f9f9f9",
                                                        }}
                                                        _hover={{ backgroundColor: "#d6d6d6" }}
                                                    >
                                                        <Td>{row.name}</Td>
                                                        <Td>{row.status}</Td>
                                                        <Td>{row.free}</Td>
                                                        <Td
                                                            style={{
                                                                color:
                                                                    row.plus30 > row.free
                                                                        ? "green"
                                                                        : row.plus30 < row.free
                                                                            ? "red"
                                                                            : "inherit",
                                                            }}
                                                        >
                                                            {row.plus30 !== undefined ? row.plus30 : "-"}
                                                        </Td>
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
                ) : mode === "Analysis" ? (
                    <Flex flex="1" direction="column" overflow="hidden">
                        <AnalysisPage />
                    </Flex>
                ) : null }
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
