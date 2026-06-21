#!/bin/bash

# Front-Dev - Start Everything (Dev Server + Tunnel)

echo "=========================================="
echo "  Front-Dev - Starting Live Access Setup"
echo "=========================================="
echo ""

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
    echo ""
fi

echo "Step 1: Starting Development Server..."
echo "---------------------------------------"
npm run dev &
DEV_PID=$!

# Wait for dev server to start
echo "Waiting for dev server to be ready..."
sleep 5

echo ""
echo "Step 2: Starting Cloudflare Tunnel..."
echo "---------------------------------------"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "cloudflared not found. Installing..."
    ./setup-tunnel.sh
    echo ""
fi

echo "============================================"
echo "  🚀 LIVE LINK SETUP"
echo "============================================"
echo ""
echo "Option 1: Quick Tunnel (NO LOGIN REQUIRED)"
echo "  - Instant access"
echo "  - No Cloudflare account needed"
echo "  - Temporary URL"
echo ""
echo "Option 2: Persistent Tunnel (LOGIN REQUIRED)"
echo "  - Requires Cloudflare account (free)"
echo "  - Stable tunnel name"
echo "  - Better for longer sessions"
echo ""
read -p "Choose [1] Quick or [2] Persistent: " choice

echo ""

if [ "$choice" = "1" ]; then
    echo "Starting Quick Tunnel..."
    echo ""
    echo "============================================"
    echo "  Your app will be accessible at the URL below"
    echo "  Share it with anyone to access from any device!"
    echo "============================================"
    echo ""
    cloudflared tunnel --url http://localhost:5173
else
    echo "Starting Persistent Tunnel..."
    echo ""
    ./start-tunnel.sh
fi

# Cleanup on exit
trap "kill $DEV_PID 2>/dev/null" EXIT
