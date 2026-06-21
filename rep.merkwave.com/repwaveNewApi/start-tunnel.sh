#!/bin/bash

# Front-Dev - HTTPS with Cloudflare Tunnel (Automated Setup)
# This script automates the Cloudflare Tunnel setup for HTTPS

set -e

echo "=========================================="
echo "  Front-Dev - Cloudflare Tunnel Setup"
echo "=========================================="
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "ERROR: cloudflared not installed"
    echo ""
    echo "Run ./setup-tunnel.sh first to install cloudflared"
    exit 1
fi

echo "✓ cloudflared is installed"
echo ""

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TUNNEL_CONFIG="$SCRIPT_DIR/tunnel-config.yml"

echo "Checking if already authenticated..."
if ! cloudflared tunnel list &>/dev/null; then
    echo "Authenticating with Cloudflare..."
    echo "This will open your browser to authenticate with Cloudflare account"
    cloudflared login
fi

echo ""
echo "Creating tunnel 'frontdev-tunnel'..."
TUNNEL_ID=$(cloudflared tunnel create frontdev-tunnel 2>&1 | grep -oP '(?<=Tunnel ID: )\S+' || echo "")

if [ -z "$TUNNEL_ID" ]; then
    # Tunnel might already exist
    echo "Tunnel 'frontdev-tunnel' already exists"
    TUNNEL_ID=$(cloudflared tunnel list | grep frontdev-tunnel | awk '{print $1}')
fi

echo "✓ Tunnel ID: $TUNNEL_ID"
echo ""

echo "🌐 Local Access URL:"
echo "   Frontend:  http://localhost:5173"
echo ""

echo "Starting Cloudflare Tunnel..."
echo "Press Ctrl+C to stop"
echo ""
echo "============================================"
echo "After tunnel starts, you'll see a public URL like:"
echo "https://xxxxx.trycloudflare.com"
echo ""
echo "Share this URL to access from any device!"
echo "============================================"
echo ""

cd "$SCRIPT_DIR"
cloudflared tunnel --url http://localhost:5173
