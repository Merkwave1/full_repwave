#!/bin/bash
cd /home/nassar/projects/front-dev
cloudflared tunnel --url http://localhost:5173 2>&1 | grep -oP 'https://[^\s]+trycloudflare\.com' | head -1 > /tmp/tunnel-url.txt &
sleep 10
if [ -f /tmp/tunnel-url.txt ]; then
    URL=$(cat /tmp/tunnel-url.txt)
    if [ ! -z "$URL" ]; then
        echo "=========================================="
        echo "✅ LIVE LINK READY!"
        echo "=========================================="
        echo ""
        echo "Your app is now accessible at:"
        echo ""
        echo "  $URL"
        echo ""
        echo "=========================================="
        echo ""
        echo "📱 Open this URL from any device!"
        echo "🔗 Share it with anyone!"
        echo ""
        echo "Keep this terminal open to maintain the tunnel."
        echo "Press Ctrl+C to stop."
        echo ""
    else
        echo "Waiting for tunnel URL..."
    fi
fi
wait
