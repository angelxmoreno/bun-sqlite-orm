#!/bin/bash

# SonarCloud Local Analysis Script
# Runs the same analysis as CI to catch issues locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting local SonarCloud analysis...${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create a .env file with:"
    echo "SONAR_TOKEN=your_sonarcloud_token"
    exit 1
fi

# Load environment variables from .env
export $(grep -v '^#' .env | xargs)

# Check if SONAR_TOKEN is set
if [ -z "$SONAR_TOKEN" ]; then
    echo -e "${RED}Error: SONAR_TOKEN not found in .env file${NC}"
    echo "Please add SONAR_TOKEN=your_sonarcloud_token to your .env file"
    exit 1
fi

# Check if sonarqube-scanner is installed
if ! command -v bunx sonar-scanner &> /dev/null; then
    echo -e "${YELLOW}Installing sonarqube-scanner...${NC}"
    bun add -d sonarqube-scanner
fi

# Generate coverage data
echo -e "${YELLOW}Generating test coverage...${NC}"
bun run test:coverage

# Run SonarCloud analysis
echo -e "${YELLOW}Running SonarCloud analysis...${NC}"
bunx sonar-scanner \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.token="$SONAR_TOKEN"

echo -e "${GREEN}SonarCloud analysis completed!${NC}"
echo "Check the output above for any issues found."