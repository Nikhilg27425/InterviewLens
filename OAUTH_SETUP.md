# OAuth Authentication Setup Guide

This guide walks you through setting up Google and GitHub OAuth authentication for InterviewLens.

## Overview

The OAuth implementation allows users to sign in with their Google or GitHub accounts. User information is automatically stored in the database, and subsequent logins will recognize existing users.

## Prerequisites

- A Google Cloud account (for Google OAuth)
- A GitHub account (for GitHub OAuth)
- Backend server running on `http://localhost:8000`
- Frontend running on `http://localhost:5173`

---

## 1. Google OAuth Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name your project (e.g., "InterviewLens")
4. Click **Create**

### Step 2: Enable Google+ API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it and press **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (or Internal if using Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: InterviewLens
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. On the **Scopes** screen, click **Add or Remove Scopes**
7. Add these scopes:
   - `openid`
   - `email`
   - `profile`
8. Click **Save and Continue**
9. Add test users if needed (for development)
10. Click **Save and Continue**

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Name it: "InterviewLens Web Client"
5. Add **Authorized JavaScript origins**:
   ```
   http://localhost:5173
   http://localhost:3000
   ```
6. Add **Authorized redirect URIs**:
   ```
   http://localhost:5173/auth/callback
   ```
7. Click **Create**
8. Copy your **Client ID** and **Client Secret**

### Step 5: Add to Backend .env

Add these to your `backend/.env` file:
```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

---

## 2. GitHub OAuth Setup

### Step 1: Create OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in the application details:
   - **Application name**: InterviewLens
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5173/auth/callback`
   - **Application description**: Technical interview platform with AI proctoring
4. Click **Register application**

### Step 2: Get Credentials

1. On your OAuth app page, you'll see your **Client ID**
2. Click **Generate a new client secret**
3. Copy both the **Client ID** and **Client Secret** immediately

### Step 3: Add to Backend .env

Add these to your `backend/.env` file:
```env
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

---

## 3. Database Migration

Run the migration to add OAuth fields to the users table:

```bash
cd backend
alembic upgrade head
```

This will:
- Make `hashed_password` nullable (OAuth users don't need passwords)
- Add `oauth_provider` field (stores 'google' or 'github')
- Add `oauth_id` field (stores the provider's user ID)
- Add `profile_picture` field (stores avatar URL)

---

## 4. Install Dependencies

Install the required OAuth library:

```bash
cd backend
pip install -r requirements.txt
```

This installs `authlib==1.3.0` which handles OAuth flows.

---

## 5. Test the Implementation

### Start the Backend
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Start the Frontend
```bash
npm run dev
```

### Test OAuth Flow

1. Navigate to `http://localhost:5173/login`
2. Click the **Google** or **GitHub** button
3. Complete the OAuth authorization
4. You should be redirected back and logged in
5. Check the database to confirm the user was created:

```sql
SELECT id, email, full_name, oauth_provider, oauth_id, profile_picture 
FROM users 
WHERE oauth_provider IS NOT NULL;
```

---

## 6. How It Works

### Frontend Flow

1. User clicks "Google" or "GitHub" button on login page
2. Browser redirects to OAuth provider's authorization page
3. User authorizes the application
4. Provider redirects back to `/auth/callback?provider=google&code=...`
5. Frontend sends the code to backend via POST `/api/auth/oauth/callback`
6. Backend exchanges code for user info and creates/updates user
7. Backend returns JWT token
8. Frontend stores token and redirects to dashboard

### Backend Flow

1. Receives OAuth code from frontend
2. Exchanges code for access token with provider
3. Uses access token to fetch user profile (email, name, picture)
4. Checks if user exists by email or oauth_id
5. Creates new user if doesn't exist, updates if exists
6. Generates JWT token
7. Returns token to frontend

### Database Storage

Users authenticated via OAuth have:
- `oauth_provider`: 'google' or 'github'
- `oauth_id`: Provider's unique user ID
- `hashed_password`: NULL (not needed for OAuth users)
- `profile_picture`: Avatar URL from provider
- All other fields populated as normal

---

## 7. Production Deployment

When deploying to production:

1. **Update OAuth Redirect URIs** in both Google and GitHub:
   - Add your production domain (e.g., `https://app.interviewlens.com/auth/callback`)

2. **Update Environment Variables**:
   ```env
   OAUTH_REDIRECT_URI=https://app.interviewlens.com/auth/callback
   CORS_ORIGINS=https://app.interviewlens.com
   ```

3. **Secure Your Credentials**:
   - Never commit `.env` files to git
   - Use environment variables in your hosting platform
   - Rotate secrets regularly

4. **HTTPS Required**:
   - OAuth providers require HTTPS in production
   - Use a reverse proxy (nginx) or platform SSL (Vercel, Heroku, etc.)

---

## 8. Troubleshooting

### "Google OAuth not configured" error
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Restart the backend server after adding variables

### "Redirect URI mismatch" error
- Ensure the redirect URI in your OAuth app matches exactly: `http://localhost:5173/auth/callback`
- Check for trailing slashes and http vs https

### "Email not provided by OAuth provider"
- For GitHub: Make sure your GitHub email is public, or request the `user:email` scope
- For Google: Ensure you've added the `email` scope

### User created but login fails
- Check that JWT token is being stored in localStorage
- Verify CORS settings allow your frontend domain
- Check browser console for errors

### Database migration fails
- Ensure PostgreSQL is running
- Check that your DATABASE_URL is correct
- Try: `alembic downgrade -1` then `alembic upgrade head`

---

## 9. Security Best Practices

1. **Never expose client secrets** in frontend code
2. **Use HTTPS** in production
3. **Validate OAuth state parameter** (prevents CSRF attacks)
4. **Store tokens securely** (use httpOnly cookies in production)
5. **Implement token refresh** for long-lived sessions
6. **Rate limit** OAuth endpoints
7. **Log OAuth attempts** for security monitoring

---

## 10. Future Enhancements

- Add Microsoft/LinkedIn OAuth providers
- Implement OAuth for candidate login
- Add 2FA for OAuth accounts
- Support linking multiple OAuth providers to one account
- Add profile picture display in UI

---

## Support

If you encounter issues:
1. Check the backend logs: `uvicorn` console output
2. Check frontend console: Browser DevTools
3. Verify OAuth app configuration in provider consoles
4. Review the `.env` file for typos

For additional help, refer to:
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Authlib Documentation](https://docs.authlib.org/en/latest/)
