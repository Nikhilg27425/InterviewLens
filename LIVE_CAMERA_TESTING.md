# Live Camera Feed - Testing Guide

## ✅ Implementation Complete

WebRTC live camera streaming from candidate to interviewer has been successfully implemented!

---

## 🎯 What Was Implemented

### 1. Backend WebRTC Signaling
**File:** `backend/app/websocket/router.py`

Added three WebRTC message handlers:
- `webrtc_offer` - Candidate sends offer to interviewer
- `webrtc_answer` - Interviewer responds with answer
- `webrtc_ice_candidate` - Both exchange ICE candidates for NAT traversal

### 2. WebRTC React Hook
**File:** `src/hooks/useWebRTC.js`

Created reusable hook that handles:
- Peer connection initialization with STUN servers
- Local camera stream capture (candidate side)
- Remote stream reception (interviewer side)
- WebRTC signaling via WebSocket
- Connection state tracking
- Automatic cleanup on unmount

### 3. Candidate Camera Integration
**File:** `src/pages/candidate/CandidateInterviewPage.jsx`

Added:
- Automatic camera start when interview begins
- Small video preview in bottom-right corner
- REC indicator with pulsing red dot
- Connection state display
- Automatic cleanup when leaving page

### 4. Interviewer Video Display
**File:** `src/pages/LiveSession.jsx`

Added:
- Live video feed from candidate's camera
- Connection status indicator
- Loading spinner while connecting
- Fallback UI if candidate hasn't started video
- Real candidate information display
- Session data integration

---

## 🧪 Testing Procedure

### Prerequisites
1. Backend server running on port 8000
2. Frontend server running on port 5173
3. Two browser windows (or one normal + one incognito)
4. Working webcam
5. Test credentials ready

### Step 1: Start Backend
```bash
cd backend
python -m uvicorn app.main:app --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

### Step 2: Start Frontend
```bash
npm run dev
```

**Expected Output:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Step 3: Open Candidate Window
1. **Navigate to:** `http://localhost:5173/candidate/login`
2. **Login with:**
   - Email: `candidate@test.com`
   - Token: `RBXT-8710-UWOX-7059`
3. **Click:** "Login"

### Step 4: Complete System Checks
1. **Allow camera permission** when prompted by browser
2. Click "Run System Check"
3. Wait for all checks to pass:
   - ✅ Camera access
   - ✅ Microphone access
   - ✅ Screen resolution
   - ✅ Network speed
4. Check "I have read and understood..." checkbox
5. Click "Begin Interview"

### Step 5: Verify Candidate Camera
**Expected Results:**
- Small video preview appears in **bottom-right corner**
- Your face visible in the preview
- Red "REC" indicator with pulsing dot
- Connection state shows: `new` → `connecting` → `connected`

**Check Console:**
```javascript
Sent WebRTC offer
WebRTC connection state: connecting
WebRTC connection state: connected
```

### Step 6: Open Interviewer Window
1. **Open new window** (or incognito window)
2. **Navigate to:** `http://localhost:5173/login`
3. **Login with:**
   - Email: `interviewer@test.com`
   - Password: `password123`
4. **Go to Dashboard**

### Step 7: Join Live Session
1. Find "Test Candidate" in Active Sessions table
2. Click "Join Session" button
3. **Or navigate directly to:**
   `http://localhost:5173/live-session?session={session_id}`

### Step 8: Verify Video Stream
**Expected Results:**
- Candidate's video feed appears in **left panel**
- Video shows live feed from candidate's camera
- "LIVE" badge with red pulsing dot
- Connection state shows: `new` → `connecting` → `connected`
- Candidate info displays: Name, Role, Email, Status

**Check Console:**
```javascript
Received remote track: video
WebRTC connection state: connecting
Added ICE candidate
WebRTC connection state: connected
```

### Step 9: Test Video Quality
1. **Move in front of candidate's camera** → See movement in interviewer's view
2. **Wave your hand** → Verify smooth video
3. **Check latency** → Should be < 1 second delay
4. **Connection state** → Should stay "connected"

### Step 10: Test Reconnection
1. **Refresh candidate page**
2. **Wait for camera to restart**
3. **Check interviewer view** → Video should reconnect automatically
4. **Connection state** → Should go `disconnected` → `connecting` → `connected`

---

## ✅ Success Criteria Checklist

### Candidate Side
- [ ] Camera permission requested on interview start
- [ ] Video preview appears in bottom-right corner
- [ ] REC indicator visible with pulsing dot
- [ ] Connection state updates (new → connecting → connected)
- [ ] Video stream stops when leaving page
- [ ] No console errors

### Interviewer Side
- [ ] Video feed appears in left panel
- [ ] Shows live video from candidate's camera
- [ ] LIVE badge visible
- [ ] Connection state indicator shows "connected"
- [ ] Real candidate info displayed (name, role, email)
- [ ] Video updates in real-time (< 1s latency)
- [ ] No console errors

### WebRTC Connection
- [ ] Offer sent from candidate
- [ ] Answer sent from interviewer
- [ ] ICE candidates exchanged
- [ ] Connection state: connected
- [ ] Remote stream received
- [ ] Video track active

---

## 🐛 Troubleshooting

### Problem: "Permission Denied" Error
**Cause:** Browser blocked camera access

**Solution:**
1. Check browser address bar for camera icon
2. Click and allow camera permission
3. Refresh page
4. Check browser settings: `chrome://settings/content/camera`

### Problem: Video Preview Not Showing
**Cause:** Camera not starting or permission denied

**Solution:**
1. Open browser console (F12)
2. Look for error: `Failed to start camera: NotAllowedError`
3. Check if another app is using camera
4. Try different browser (Chrome recommended)
5. Check camera in system settings

### Problem: "Connecting..." Never Completes
**Cause:** WebSocket not connected or signaling failed

**Solution:**
1. Check backend console for WebSocket errors
2. Verify both candidate and interviewer are connected
3. Check browser console for WebRTC errors
4. Ensure backend is running on port 8000
5. Check WebSocket URL in browser Network tab

### Problem: Connection State Shows "failed"
**Cause:** ICE candidate exchange failed or firewall blocking

**Solution:**
1. Both users must be on same network or use TURN server
2. Check firewall settings
3. Try disabling VPN
4. Check browser console for ICE errors
5. For production, add TURN server configuration

### Problem: High Latency (> 2 seconds)
**Cause:** Network issues or processing delay

**Solution:**
1. Check network speed (should be > 1 Mbps)
2. Close other bandwidth-heavy applications
3. Try on different network
4. Check CPU usage (video encoding is intensive)

### Problem: Interviewer Sees Spinner, No Video
**Cause:** Candidate hasn't started video or connection not established

**Solution:**
1. Verify candidate is on interview page (not waiting room)
2. Check candidate's video preview is showing
3. Refresh both windows
4. Check WebSocket connection (green indicator)
5. Look for errors in both browser consoles

---

## 📊 Browser Console Debugging

### Candidate Console Should Show:
```javascript
WebRTC connection state: new
Sent WebRTC offer
WebRTC connection state: connecting
Added ICE candidate (multiple times)
Received WebRTC answer
WebRTC connection state: connected
```

### Interviewer Console Should Show:
```javascript
WebRTC connection state: new
Sent WebRTC answer
WebRTC connection state: connecting
Added ICE candidate (multiple times)
Received remote track: video
WebRTC connection state: connected
```

### Backend Console Should Show:
```python
INFO: WebRTC offer sent from {user_id} in session {session_id}
INFO: WebRTC answer sent from {user_id} in session {session_id}
DEBUG: ICE candidate exchanged in session {session_id}
```

---

## 🎥 Expected Visual Results

### Candidate Screen:
```
┌─────────────────────────────────────────────────┐
│  Interview Page (Full Screen)                   │
│                                                  │
│  [Problem Statement]  [Code Editor]  [Tests]   │
│                                                  │
│                                                  │
│                                   ┌──────────┐  │
│                                   │ [VIDEO]  │  │
│                                   │  🔴 REC  │  │
│                                   │ connected│  │
│                                   └──────────┘  │
└─────────────────────────────────────────────────┘
```

### Interviewer Screen:
```
┌──────────────┬──────────────────────────┬─────────┐
│              │                          │         │
│  CANDIDATE   │   CODE EDITOR (LIVE)     │ SIGNALS │
│              │                          │         │
│  [INFO]      │                          │ [FEED]  │
│  Name        │   (Real-time code sync)  │         │
│  Role        │                          │ [CHAT]  │
│              │                          │         │
│  [VIDEO]     │                          │         │
│  🔴 LIVE     │                          │         │
│  Connected   │                          │         │
│              │                          │         │
└──────────────┴──────────────────────────┴─────────┘
```

---

## 🔧 Configuration

### STUN Servers (Current)
```javascript
// In useWebRTC.js
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
}
```

**Note:** These are public Google STUN servers. For production, consider:
- Adding your own STUN server
- Adding TURN server for corporate networks
- Using a service like Twilio TURN

### Video Constraints (Current)
```javascript
// In useWebRTC.js - startVideo()
video: {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: 'user'
}
```

**Adjust if needed:**
- Lower resolution for slower networks: `640x480`
- Higher quality: `1920x1080`
- Mobile: `facingMode: 'environment'` for back camera

---

## 🚀 Next Steps / Future Enhancements

### Immediate Improvements:
1. **Add Audio:** Include audio track in video stream
2. **Quality Controls:** Add bitrate/resolution controls
3. **Error Notifications:** Show toast messages for errors
4. **Retry Logic:** Auto-reconnect on failure

### Advanced Features:
1. **Recording:** Use MediaRecorder to save interview video
2. **Screen Share:** Allow candidate to share screen
3. **Picture-in-Picture:** Enable PiP mode
4. **Multiple Views:** Support multiple interviewers
5. **Network Stats:** Display bandwidth, FPS, latency
6. **Bandwidth Adaptation:** Adjust quality based on network

### Production Requirements:
1. **TURN Server:** Deploy for corporate networks
2. **HTTPS:** Required for WebRTC in production
3. **Permissions UI:** Better camera permission flow
4. **Fallback:** Graceful degradation if WebRTC fails
5. **Analytics:** Track connection success rate

---

## 📝 Technical Notes

### How It Works:
1. **Candidate starts interview** → Camera activated → Local stream captured
2. **useWebRTC hook** → Creates peer connection → Adds video track
3. **Candidate sends offer** → Via WebSocket → To interviewer
4. **Interviewer receives offer** → Creates answer → Sends back
5. **ICE candidates exchanged** → NAT traversal configured
6. **Connection established** → Video flows peer-to-peer
7. **Interviewer displays** → Remote stream in video element

### WebRTC vs WebSocket:
- **WebSocket:** Used only for signaling (offer/answer/ICE)
- **WebRTC:** Used for actual video streaming (peer-to-peer)
- **Why?** WebRTC is more efficient for media streaming

### Browser Compatibility:
- ✅ Chrome 80+ (Recommended)
- ✅ Firefox 75+
- ✅ Edge 80+
- ✅ Safari 14+
- ❌ IE 11 (No WebRTC support)

---

## 🎉 Success!

If all tests pass, you now have:
- ✅ Live camera feed from candidate to interviewer
- ✅ Real-time video streaming with < 1s latency
- ✅ WebRTC peer-to-peer connection
- ✅ Proper error handling and state management
- ✅ Clean UI with connection indicators

The interviewer can now monitor the candidate's video feed in real-time during the technical interview! 🎥

---

## 📞 Support

If issues persist:
1. Check browser console for errors
2. Verify WebSocket connection (green indicator)
3. Test camera in system settings
4. Try different browser
5. Check firewall settings
6. Review backend logs

**Test Credentials:**
- Interviewer: `interviewer@test.com` / `password123`
- Candidate: `candidate@test.com` / Token: `RBXT-8710-UWOX-7059`
