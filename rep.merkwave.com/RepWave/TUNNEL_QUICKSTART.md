# Front-Dev - Tunnel Setup for Live Access

This guide will help you set up a free HTTPS tunnel to access your front-dev application from any device.

## 🚀 Quick Start

### 1. Install Cloudflared Tunnel

```bash
chmod +x setup-tunnel.sh
./setup-tunnel.sh
```

### 2. Start Your Development Server

In one terminal, start your Vite dev server:

```bash
npm run dev
```

This will start the app on http://localhost:5173

### 3. Start the Tunnel

In another terminal, start the Cloudflare tunnel:

```bash
chmod +x start-tunnel.sh
./start-tunnel.sh
```

The first time you run this:
1. Your browser will open
2. Log in with your Cloudflare account (create a free one if needed)
3. Authorize cloudflared

After authentication, you'll see a public URL like:
```
https://xxxxx-xxxx-xxxx.trycloudflare.com
```

### 4. Access from Any Device

Share the tunnel URL (https://xxxxx-xxxx-xxxx.trycloudflare.com) with anyone!

They can access your app from:
- Mobile phones
- Tablets
- Other computers
- Anywhere in the world

## 🎯 What You Get

✅ **Free HTTPS** - Valid SSL certificate  
✅ **Public Access** - Share with anyone, anywhere  
✅ **No Configuration** - No domain or DNS setup needed  
✅ **No Firewall Issues** - Works through NAT/firewalls  
✅ **Live Reloading** - Hot Module Replacement still works  

## 📝 Common Commands

Start dev server:
```bash
npm run dev
```

Start tunnel (in another terminal):
```bash
./start-tunnel.sh
```

Stop tunnel:
```bash
Press Ctrl+C in the tunnel terminal
```

## 🔧 Troubleshooting

**Issue:** Tunnel shows error connecting to localhost:5173  
**Solution:** Make sure your dev server (`npm run dev`) is running first

**Issue:** Browser won't open for authentication  
**Solution:** Manually go to the URL shown in the terminal

**Issue:** Tunnel URL not working  
**Solution:** Check that both the dev server and tunnel are running

## 🌐 Alternative: Quick Tunnel (No Account Needed)

For a quick test without authentication:

```bash
cloudflared tunnel --url http://localhost:5173
```

This gives you a temporary URL without needing to log in!

## 📱 Testing on Mobile

1. Start dev server: `npm run dev`
2. Start tunnel: `./start-tunnel.sh`
3. Copy the tunnel URL (e.g., https://xxxxx.trycloudflare.com)
4. Open that URL on your phone's browser
5. Done! You're accessing your local dev server from your phone

## 🎨 How It Works

```
Your Computer          Cloudflare          Any Device
├─ Vite Dev (5173) ─→ Tunnel Edge ─→  https://xxxxx.trycloudflare.com
└─ Cloudflared      (Encrypted)      Works from anywhere!
```

The tunnel creates a secure connection from your localhost to Cloudflare's edge network, making it accessible worldwide with HTTPS.
