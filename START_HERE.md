# 🚀 Start Here - OAuth Setup & Testing

## Step 1: Check if Backend is Running

Open PowerShell in the project directory and run:

```powershell
.\test-backend.ps1
```

This will check if your backend is running and if OAuth is configured correctly.

---

## Step 2: Start the Backend (if not running)

### Option A: Using PowerShell

```powershell
cd backend
python -m uvicorn app.main:app --reload
```

### Option B: Check if it's running
Open your browser and go to: http://localhost:8000/health

You should see: `{"status":"ok","version":"1.0.0"}`

---

## Step 3: Run Database Migration (First Time Only)

If you haven't run the migration yet:

```powershell
cd backend
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade 0001 -> 0002, add oauth fields
```

---

## Step 4: Verify OAuth Configuration

Your `.env` file should have these filled in:

```env
GOOGLE_CLIENT_ID=874296066182-9eb1172v3p4gh7fumv3ht0b80d24qmbm.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

GITHUB_CLIENT_ID=Ov23liW6zGsZhK7b2tg1
GITHUB_CLIENT_SECRET=8d5c18a027dd92a7080880192cdff95f51c8757a
```

✅ **Good news:** Your keys are already in the `.env` file!

---

## Step 5: Verify OAuth Apps Configuration

### Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Make sure **Authorized redirect URIs** includes:
   ```
   http://localhost:5173/auth/callback
   ```

### GitHub Developer Settings
1. Go to: https://github.com/settings/developers
2. Click on your OAuth App
3. Verify **Authorization callback URL** is:
   ```
   http://localhost:5173/auth/callback
   ```

---

## Step 6: Start Frontend

In a **new PowerShell window**:

```powershell
npm run dev
```

This should start on: http://localhost:5173

---

## Step 7: Test OAuth Login

1. Open browser: http://localhost:5173/login
2. Click **Google** or **GitHub** button
3. You should be redirected to the OAuth provider
4. Authorize the app
5. You should be redirected back and logged in!

---

## 🐛 Troubleshooting

### Problem: "localhost refused to connect"

**Solution:**
```powershell
# Check if backend is running
curl http://localhost:8000/health

# If not, start it:
cd backend
python -m uvicorn app.main:app --reload
```

### Problem: "Google OAuth not configured"

**Solution:**
1. Check `.env` file has Google credentials
2. Restart backend server
3. Run test script: `.\test-backend.ps1`

### Problem: "Redirect URI mismatch"

**Solution:**
1. Go to Google Cloud Console
2. Edit your OAuth client
3. Add exact URI: `http://localhost:5173/auth/callback`
4. Save and wait 5 minutes for changes to propagate

### Problem: Backend starts but OAuth doesn't work

**Solution:**
```powershell
# 1. Stop backend (Ctrl+C)
# 2. Check .env has no spaces around = sign:
#    GOOGLE_CLIENT_ID=your-id    ✓ Good
#    GOOGLE_CLIENT_ID = your-id  ✗ Bad (has spaces)
# 3. Restart backend
cd backend
python -m uvicorn app.main:app --reload
```

### Problem: Database migration fails

**Solution:**
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# If not running, start it from Services or pgAdmin

# Then run migration again
cd backend
alembic upgrade head
```

---

## ✅ Success Checklist

- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:5173
- [ ] Database migration completed
- [ ] OAuth keys in `.env` file
- [ ] Redirect URIs configured in Google & GitHub
- [ ] Test script passes all checks
- [ ] Can click OAuth buttons without errors
- [ ] Successfully redirected to OAuth provider
- [ ] Successfully logged in after authorization

---

## 🔍 Quick Diagnostics

Run these commands to check everything:

```powershell
# Test backend
curl http://localhost:8000/health

# Test Google OAuth redirect (should return 307)
curl -I http://localhost:8000/api/auth/google/login

# Test GitHub OAuth redirect (should return 307)
curl -I http://localhost:8000/api/auth/github/login

# Run full test
.\test-backend.ps1
```

---

## 📞 Still Having Issues?

1. Check backend console for error messages
2. Check browser console (F12) for JavaScript errors
3. Verify PostgreSQL is running
4. Make sure ports 8000 and 5173 aren't blocked by firewall
5. Try restarting both backend and frontend

---

## 🎉 Once It's Working

After successful login:
- Check `localStorage` in browser (F12 → Application → Local Storage)
- Should see `access_token` and `user` data
- User data stored in database automatically
- Profile picture URL saved if available

Query database to see OAuth users:
```sql
SELECT email, full_name, oauth_provider, oauth_id, profile_picture 
FROM users 
WHERE oauth_provider IS NOT NULL;
```

---

**Need more help?** Check the detailed guides:
- `OAUTH_QUICK_START.md` - Quick 5-minute setup
- `OAUTH_SETUP.md` - Comprehensive guide
- `MIGRATION_INSTRUCTIONS.md` - Database help
