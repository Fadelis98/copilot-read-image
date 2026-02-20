#!/bin/bash

# Scripts: checkout-and-initialize.sh
# Purpose: Standardized branch checkout and initialization for Agent
# Usage: ./scripts/checkout-and-initialize.sh <branch-name> [flags]

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BRANCH_NAME=$1

if [ -z "$BRANCH_NAME" ]; then
  echo -e "${RED}❌ Usage: ./scripts/checkout-and-initialize.sh <branch-name>${NC}"
  exit 1
fi

echo -e "${BLUE}🔀 Checking out branch: $BRANCH_NAME${NC}"
git checkout "$BRANCH_NAME" || git checkout -b "$BRANCH_NAME" "origin/$BRANCH_NAME"

echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm ci

echo -e "${BLUE}🔨 Building...${NC}"
npm run build

echo -e "${BLUE}🧪 Running tests...${NC}"
npm test || true

echo -e "${GREEN}✅ Branch ready for development!${NC}"
