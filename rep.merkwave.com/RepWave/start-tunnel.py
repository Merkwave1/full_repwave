#!/usr/bin/env python3
import subprocess
import re
import sys
import time

print("=" * 50)
print("  Starting Cloudflare Tunnel for Front-Dev")
print("=" * 50)
print()
print("Starting tunnel... Please wait...")
print()

# Start cloudflared tunnel
proc = subprocess.Popen(
    ['cloudflared', 'tunnel', '--url', 'http://localhost:5173'],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    universal_newlines=True,
    bufsize=1
)

url_found = False
url_pattern = re.compile(r'https://[a-zA-Z0-9\-]+\.trycloudflare\.com')

try:
    for line in iter(proc.stdout.readline, ''):
        # Check for URL in the line
        match = url_pattern.search(line)
        if match and not url_found:
            url = match.group(0)
            url_found = True
            print("=" * 50)
            print("✅  LIVE LINK IS READY!")
            print("=" * 50)
            print()
            print(f"  🌐 Your Live URL:")
            print()
            print(f"     {url}")
            print()
            print("=" * 50)
            print()
            print("📱  Open this link from ANY device!")
            print("🔗  Share it with anyone!")
            print()
            print("Keep this running. Press Ctrl+C to stop.")
            print()
            print("=" * 50)
            print()
            # Save URL to file
            with open('/tmp/frontdev-tunnel-url.txt', 'w') as f:
                f.write(url)
        
        # Print connection status lines
        if 'Registered tunnel connection' in line or 'INF' in line:
            if not url_found:
                print("⏳ Establishing tunnel connection...")
        
        sys.stdout.flush()
    
    proc.wait()
except KeyboardInterrupt:
    print("\n\n🛑 Stopping tunnel...")
    proc.terminate()
    proc.wait()
    print("✅ Tunnel stopped.")
