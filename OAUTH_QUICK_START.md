# OAuth Quick Start

## 🚀 Get OAuth Working in 5 Minutes

### 1. Install Dependencies
```bash
cd backend
pip install authlib==1.3.0
```

### 2. Run Database Migration
```bash
cd backend
alembic upgrade head
```

### 3. Get Google OAuth Credentials

**Quick Setup:**
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Add redirect URI: `http://localhost:5173/auth/callback`
6. Copy Client ID and Secret

### 4. Get GitHub OAuth Credentials

**Quick Setup:**
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Homepage: `http://localhost:5173`
4. Callback: `http://localhost:5173/auth/callback`
5. Copy Client ID and Secret

### 5. Configure Backend

Create or update `backend/.env`:
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Redirect URI
OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
```

### 6. Restart Backend
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### 7. Test It Out

1. Open `http://localhost:5173/login`
2. Click "Google" or "GitHub" button
3. Authorize the app
4. You're logged in! ✅

---

## 📝 What Changed

### Backend Files Modified:
- `backend/app/models/user.py` - Added OAuth fields
- `backend/app/api/routes/auth.py` - Added OAuth routes
- `backend/app/core/config.py` - Added OAuth settings
- `backend/app/schemas/user.py` - Added OAuth response fields
- `backend/requirements.txt` - Added authlib
- `backend/alembic/versions/0002_add_oauth_fields.py` - New migration

### Frontend Files Modified:
- `src/pages/LoginPage.jsx` - Added OAuth button handlers
- `src/services/api.js` - Added OAuth API methods
- `src/App.jsx` - Added OAuth callback route

### New Files:
- `src/pages/OAuthCallback.jsx` - Handles OAuth redirects
- `backend/.env.example` - Environment template
- `OAUTH_SETUP.md` - Full setup guide
- `OAUTH_QUICK_START.md` - This file

---

## 🔍 How to Verify It Works

### Check User in Database:
```sql
SELECT email, full_name, oauth_provider, profile_picture 
FROM users 
WHERE oauth_provider IS NOT NULL;
```

### Test Login Flow:
1. Use Google/GitHub to sign in
2. Check localStorage for `access_token`
3. Verify user info in `localStorage.user`
4. Confirm redirect to dashboard

---

## ⚠️ Common Issues

**"OAuth not configured"**
- Add credentials to `.env` file
- Restart backend server

**"Redirect URI mismatch"**
- Ensure OAuth app has exact URI: `http://localhost:5173/auth/callback`

**"Email not provided"**
- For GitHub: Make your email public in settings

---

## 📚 Need More Details?

See `OAUTH_SETUP.md` for:
- Step-by-step screenshots
- Production deployment guide
- Security best practices
- Troubleshooting tips

---

**That's it! OAuth is ready to use.** 🎉
