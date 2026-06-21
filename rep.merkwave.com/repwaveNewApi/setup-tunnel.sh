#!/bin/bash

# Cloudflare Tunnel Setup for Front-Dev
# This script sets up free HTTPS with valid certificates

echo "=========================================="
echo "  Front-Dev - Cloudflare Tunnel Setup"
echo "=========================================="
echo ""
echo "This will create a free HTTPS tunnel with valid certificates"
echo "No domain purchase needed - access via tunnel URL"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."
    
    echo "Downloading cloudflared..."
    cd /tmp
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
    
    echo "Installing cloudflared to /usr/local/bin/..."
    sudo chmod +x cloudflared
    sudo mv cloudflared /usr/local/bin/
    
    echo "✓ cloudflared installed successfully"
else
    echo "✓ cloudflared is already installed"
fi

echo ""
echo "cloudflared version:"
cloudflared --version
echo ""
echo "Setup complete!"
echo ""
echo "Next step: Run ./start-tunnel.sh to start the tunnel"
