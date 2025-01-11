import { Box, Flex, Select, Button, Text } from "@open-pioneer/chakra-integration";
import { MapContainer, MapAnchor, useMapModel } from "@open-pioneer/map";
import { MAP_ID } from "./services";
import React, { useState } from "react";
import { Geolocation } from "@open-pioneer/geolocation";
import { InitialExtent, ZoomIn, ZoomOut } from "@open-pioneer/map-navigation";
import { useIntl } from "open-pioneer:react-hooks";
import { transformExtent } from "ol/proj";

export function ForecastingPage() {
    const { map } = useMapModel(MAP_ID);
    const intl = useIntl();
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const now = new Date();
    const initialWeekday = weekdays[now.getDay() - 1];
    const initialTime = now.toTimeString().slice(0, 5);
    const [selectedWeekday, setSelectedWeekday] = useState(initialWeekday);
    const [selectedTime, setSelectedTime] = useState(initialTime);
    const [selectedInterval, setSelectedInterval] = useState(30);

    const handleCalculate = () => {
        console.log(`Calculating forecast for ${selectedWeekday}, ${selectedTime}, interval: ${selectedInterval} mins`);
    };

    return (
        <Flex direction="column" height="100vh" width="100%" padding="4" gap="4">
            {/* Top Section */}
            <Box
                backgroundColor="white"
                padding="4"
                boxShadow="lg"
                borderRadius="md"
                margin="2"
            >
                <Flex gap="2" alignItems="center" justifyContent="space-between" flexWrap="wrap">
                    {/* Weekday Select */}
                    <Select
                        value={selectedWeekday}
                        onChange={(e) => setSelectedWeekday(e.target.value)}
                        width="150px"
                        backgroundColor="white"
                        borderWidth="1px"
                        boxShadow="sm"
                    >
                        {weekdays.map((day) => (
                            <option key={day} value={day}>
                                {day}
                            </option>
                        ))}
                    </Select>

                    {/* Time Input */}
                    <Select
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        width="100px"
                        backgroundColor="white"
                        borderWidth="1px"
                        boxShadow="sm"
                    >
                        {Array.from({ length: 48 }).map((_, i) => {
                            const hour = Math.floor(i / 2);
                            const minute = i % 2 === 0 ? "00" : "30";
                            return (
                                <option key={`${hour}:${minute}`} value={`${hour.toString().padStart(2, "0")}:${minute}`}>
                                    {`${hour.toString().padStart(2, "0")}:${minute}`}
                                </option>
                            );
                        })}
                    </Select>

                    {/* Interval Selection */}
                    <Select
                        value={selectedInterval}
                        onChange={(e) => setSelectedInterval(Number(e.target.value))}
                        width="150px"
                        backgroundColor="white"
                        borderWidth="1px"
                        boxShadow="sm"
                    >
                        {[30, 60, 90, 120, 180, 240, 360, 480, 600, 720].map((interval) => (
                            <option key={interval} value={interval}>
                                {interval} minutes
                            </option>
                        ))}
                    </Select>

                    {/* Calculate Button */}
                    <Button
                        onClick={handleCalculate}
                        backgroundColor="#2d7d9f"
                        color="white"
                        boxShadow="sm"
                        width="150px"
                    >
                        Start Forecast
                    </Button>
                </Flex>
            </Box>

            {/* Map Section */}
            <Box
                flex="1"
                borderWidth="1px"
                boxShadow="lg"
                backgroundColor="white"
                borderRadius="md"
                margin="2"
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
                    {/* Buttons Karte */}
                    <MapAnchor position="top-right" horizontalGap={10} verticalGap={30}>
                        <Flex
                            role="bottom-right"
                            direction="column"
                            gap={1}
                            padding={1}
                        >
                            <Geolocation mapId={MAP_ID} />
                            <ZoomIn mapId={MAP_ID} />
                            <ZoomOut mapId={MAP_ID} />
                        </Flex>
                    </MapAnchor>
                </MapContainer>
            </Box>
        </Flex>
    );
}
