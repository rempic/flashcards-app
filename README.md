# Flashcards App

## Quick Start

### Desktop Access
```bash
cd /path/to/flashcards-app
python3 -m http.server 8000
open http://localhost:8000
```

### Mobile Access (Important!)
**You cannot use `localhost` on mobile!** Use your computer's IP address instead.

1. **Find your computer's IP address:**
   - **Mac/Linux**: `ifconfig | grep "inet "` or `ipconfig getifaddr en0`
   - **Windows**: `ipconfig` (look for IPv4 Address)
   - Usually looks like: `192.168.1.100` or `10.0.0.5`

2. **Start the server:**
   ```bash
   python3 -m http.server 8000
   ```

3. **Access from mobile:**
   - Use: `http://YOUR_IP_ADDRESS:8000`
   - Example: `http://192.168.1.100:8000`
   - **Both devices must be on the same Wi-Fi network**

### Troubleshooting Mobile Errors

**"Server 800 Error" or Network Errors:**
- ✅ Use IP address, not `localhost`
- ✅ Ensure both devices on same Wi-Fi
- ✅ Check firewall allows port 8000
- ✅ Try accessing URL directly in mobile browser
- ✅ Clear mobile browser cache

**File Not Found Errors:**
- ✅ Ensure JSON files exist in the same directory
- ✅ Check server is running in the correct directory
- ✅ Verify file names match exactly (case-sensitive)

### Stop Server
```bash
lsof -i :8000
pkill -f "python3 -m http.server"
```