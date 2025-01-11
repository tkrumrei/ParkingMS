import React from "react";
import { Box, Text, Flex } from "@chakra-ui/react";

export function AnalysisPage() {
    return (
        <Flex direction="column" padding="4">
            <Box
                backgroundColor="white"
                borderWidth="1px"
                borderRadius="lg"
                boxShadow="lg"
                padding="4"
                flex="1"
            >
                <Text fontSize="2xl" fontWeight="bold">
                    Analysis
                </Text>
                <Text>
                    This page will display detailed analysis of parking data, including trends, statistics, and visualizations.
                </Text>
            </Box>
        </Flex>
    );
}
