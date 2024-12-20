// SPDX-FileCopyrightText: 2023 Open Pioneer project (https://github.com/open-pioneer)
// SPDX-License-Identifier: Apache-2.0
import { Box, Flex, Table, Thead, Tr, Th, Tbody, Td, Text, Button } from "@open-pioneer/chakra-integration";
import { MapAnchor, MapContainer, useMapModel } from "@open-pioneer/map";
import { MAP_ID } from "./services";
import { useEffect } from "react";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector.js";
import GeoJSON from "ol/format/GeoJSON";
import Style from "ol/style/Style";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import CircleStyle from "ol/style/Circle";

// Mock parking data
const mockParkingData = [
    { name: "Parking 1", free: 14, total: 21 },
    { name: "Parking 2", free: 44, total: 56 },
    { name: "Parking 3", free: 85, total: 89 },
];

export function MapApp() {
    const { map } = useMapModel(MAP_ID);

    useEffect(() => {
        if (map?.layers) {
            const vectorSource = new VectorSource({
                url: "./data/plannedAreas.geojson", // GeoJSON file path
                format: new GeoJSON({
                    dataProjection: "EPSG:3857",
                    featureProjection: "EPSG:3857"
                })
            });

            const geojsonLayer = new VectorLayer({
                source: vectorSource,
                style: new Style({
                    fill: new Fill({ color: "rgba(0, 123, 255, 0.5)" }),
                    stroke: new Stroke({ color: "#007bff", width: 2 }),
                    image: new CircleStyle({
                        radius: 6,
                        fill: new Fill({ color: "#ffcc33" })
                    })
                })
            });

            map.olMap.addLayer(geojsonLayer);
        }
    }, [map]);

    return (
        <Flex direction="column" height="100vh" width="100%">
            {/* Navbar */}
            <Box
                backgroundColor="blue.500"
                padding="4"
                color="white"
                boxShadow="lg"
            >
                <Flex justifyContent="space-between" alignItems="center">
                    {/* Title */}
                    <Text fontSize="xl" fontWeight="bold">
                        ParkingMS
                    </Text>
                    {/* Navigation Links */}
                    <Flex gap="4" alignItems="center">
                        <Button variant="ghost" color="white">
                            Home
                        </Button>
                        <Button variant="ghost" color="white">
                            About
                        </Button>
                        <Button variant="ghost" color="white">
                            Contact
                        </Button>
                        {/* Logo */}
                        <Box>
                            <img
                                src={"../../img/parkingms-logo.png"}
                                alt="ParkingMS Logo"
                                style={{ height: "40px", width: "40px", borderRadius: "50%" }}
                            />
                        </Box>
                    </Flex>
                </Flex>
            </Box>

            {/* Hauptinhalt */}
            <Flex height="100%" width="100%" direction="row" overflow="hidden">
                {/* Linker Bereich: Karte und Tabelle */}
                <Flex direction="column" width="60%" overflow="hidden">
                    {/* Kartenbereich */}
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
                            role="main"
                            aria-label="Interactive Parking Map"
                        >
                            <MapAnchor position="top-left" horizontalGap={5} verticalGap={5} />
                        </MapContainer>
                    </Box>
                    {/* Tabellenbereich */}
                    <Box
                        backgroundColor="white"
                        borderWidth="1px"
                        borderRadius="lg"
                        boxShadow="lg"
                        padding="4"
                        overflow="hidden"
                    >
                        <Table variant="simple">
                            <Thead>
                                <Tr>
                                    <Th>Parking Facility</Th>
                                    <Th>Free (%)</Th>
                                    <Th>Total Capacity</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {mockParkingData.map((parking) => (
                                    <Tr key={parking.name}>
                                        <Td>{parking.name}</Td>
                                        <Td>{((parking.free / parking.total) * 100).toFixed(0)}%</Td>
                                        <Td>{parking.total}</Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </Box>
                </Flex>

                {/* Rechter Bereich: Zwei Boxen */}
                <Flex direction="column" width="40%" padding="4" gap="4">
                    <Box
                        backgroundColor="white"
                        borderWidth="1px"
                        borderRadius="lg"
                        boxShadow="lg"
                        padding="4"
                        flex="1"
                    >
                        <p>Content for Box 1</p>
                    </Box>
                    <Box
                        backgroundColor="white"
                        borderWidth="1px"
                        borderRadius="lg"
                        boxShadow="lg"
                        padding="4"
                        flex="1"
                    >
                        <p>Content for Box 2</p>
                    </Box>
                </Flex>
            </Flex>
        </Flex>
    );
}
