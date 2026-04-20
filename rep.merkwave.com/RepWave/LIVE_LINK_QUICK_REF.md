🌐 FRONT-DEV LIVE LINK - QUICK REFERENCE
========================================

## 🚀 FASTEST WAY - ONE COMMAND:

```bash
./start-live.sh
```

Then choose option [1] for instant access (no login needed)!

---

## 📱 STEP-BY-STEP:

### Method 1: Super Quick (No Login)
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start tunnel  
cloudflared tunnel --url http://localhost:5173
```

### Method 2: Use the ./start-live.sh script
```bash
./start-live.sh
```

Choose option 1 or 2 when prompted

---

## ✅ WHAT YOU GET:

After running the tunnel, you'll see:
```
|  Your quick Tunnel has been created! Visit it at:
|  https://randomly-generated-name.trycloudflare.com
```

**Copy that URL and open it from ANY device:**
- ✅ Your phone
- ✅ Your tablet  
- ✅ Friend's computer
- ✅ Anywhere in the world!

---

## 🎯 EXPECTED OUTPUT:

```
VITE v5.x.x  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help

+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at:
|  https://abc-123-def.trycloudflare.com
+--------------------------------------------------------------------------------------------+
```

Share the `https://abc-123-def.trycloudflare.com` link!

---

## 💡 TIPS:

- The tunnel URL changes each time you start it
- Keep both terminals running (dev server + tunnel)
- Hot reload works through the tunnel
- Press Ctrl+C in the tunnel terminal to stop

---

## 🔧 TROUBLESHOOTING:

**Issue:** "Connection refused" on tunnel URL  
**Fix:** Make sure `npm run dev` is running first

**Issue:** Tunnel keeps reconnecting  
**Fix:** Normal behavior, wait a few seconds

**Issue:** Need a stable URL that doesn't change  
**Fix:** Use `./start-tunnel.sh` (requires Cloudflare login)
