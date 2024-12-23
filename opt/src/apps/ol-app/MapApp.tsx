import { Box, Flex, Table, Thead, Tr, Th, Tbody, Td, Text, Button, Select } from "@open-pioneer/chakra-integration";
import { MapAnchor, MapContainer, useMapModel } from "@open-pioneer/map";
import { MAP_ID } from "./services";
import React, { useEffect, useState } from "react";
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
  const [mode, setMode] = useState("Live Tracking");

  useEffect(() => {
    if (map?.layers) {
      const vectorSource = new VectorSource({
        url: "./data/parking_spotsMS.geojson", // GeoJSON file path
        format: new GeoJSON({
          dataProjection: "EPSG:3857",
          featureProjection: "EPSG:3857",
        }),
      });

      const geojsonLayer = new VectorLayer({
        source: vectorSource,
        style: new Style({
          fill: new Fill({ color: "rgba(0, 123, 255, 0.5)" }),
          stroke: new Stroke({ color: "#007bff", width: 2 }),
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: "#ffcc33" }),
          }),
        }),
      });

      map.olMap.addLayer(geojsonLayer);
    }
  }, [map]);

  return (
    <Flex direction="column" height="100vh" width="100%">
      {/* Navbar */}
      <Box backgroundColor="blue.500" padding="4" color="white" boxShadow="lg">
        <Flex justifyContent="space-between" alignItems="center">
          {/* Left: Logo and Title */}
          <Flex alignItems="center" gap="3">
            <Box>
              <img
                src={"/img/icon_ParkingMS.png"}
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
            fontSize="lg"
            fontWeight="bold"
            border="none"
            boxShadow="md"
            _focus={{ outline: "none" }}
            _hover={{ backgroundColor: "blue.500" }}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option
              value="Live Tracking"
              style={{ fontSize: "1rem", padding: "10px", backgroundColor: "white", color: "black" }}
            >
              Live Tracking
            </option>
            <option
              value="Forecasting"
              style={{ fontSize: "1rem", padding: "10px", backgroundColor: "white", color: "black" }}
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

      {/* Hauptinhalt dynamisch basierend auf "mode" */}
      {mode === "Live Tracking" ? (
        <Flex height="100%" width="100%" direction="row" overflow="hidden">
          {/* Left Section: Map and Table */}
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
                role="main"
                aria-label="Interactive Parking Map"
              >
                <MapAnchor position="top-left" horizontalGap={5} verticalGap={5} />
              </MapContainer>
            </Box>
            {/* Table Section */}
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
        </Flex>
      ) : (
        <Flex direction="column" padding="4">
          <Box
            backgroundColor="white"
            borderWidth="1px"
            borderRadius="lg"
            boxShadow="lg"
            padding="4"
          >
            <Text fontSize="2xl" fontWeight="bold">
              Forecasting Data
            </Text>
            <p>This is where your forecasting content will go.</p>
          </Box>
        </Flex>
      )}
    </Flex>
  );
}