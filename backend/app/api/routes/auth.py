from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from starlette.responses import RedirectResponse
import httpx
from urllib.parse import urlencode

from app.db.base import get_db
from app.models.user import User, UserRole
from app.models.session import InterviewSession, SessionStatus
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.schemas.user import UserCreate, UserLogin, CandidateLogin, TokenResponse, UserOut, CandidateCreate
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Interviewer registration ──────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=201)
async def register_interviewer(body: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=body.role,
        company=body.company,
    )
    db.add(user)
    await db.flush()
    return user


# ── Interviewer login ─────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login_interviewer(body: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if user is OAuth-only (no password set)
    if user.hashed_password is None:
        raise HTTPException(
            status_code=400, 
            detail=f"This account uses {user.oauth_provider} sign-in. Please use the {user.oauth_provider.title()} button to log in."
        )
    
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    
    if user.role == UserRole.candidate:
        raise HTTPException(status_code=403, detail="Use /auth/candidate/login for candidates")

    token = create_access_token(str(user.id), extra={"role": user.role})
    return TokenResponse(
        access_token=token,
        role=user.role,
        user_id=str(user.id),
        full_name=user.full_name,
    )


# ── Candidate login (email + session access token) ────────────────────────────

@router.post("/candidate/login", response_model=TokenResponse)
async def login_candidate(body: CandidateLogin, db: AsyncSession = Depends(get_db)):
    # Verify session token exists and is not completed/cancelled
    sess_result = await db.execute(
        select(InterviewSession).where(InterviewSession.access_token == body.access_token)
    )
    session = sess_result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Invalid access token")
    if session.status in (SessionStatus.completed, SessionStatus.cancelled):
        raise HTTPException(status_code=410, detail="Session is no longer active")

    # SECURITY FIX: Verify email matches the session's intended candidate email
    if session.candidate_email and session.candidate_email.lower() != body.email.lower():
        raise HTTPException(
            status_code=403, 
            detail=f"This session is assigned to {session.candidate_email}. Please use the correct email address."
        )

    # Get or create candidate user
    user_result = await db.execute(select(User).where(User.email == body.email))
    user = user_result.scalar_one_or_none()

    if not user:
        # Auto-create candidate account on first login
        user = User(
            email=body.email,
            full_name=session.candidate_name or body.email.split("@")[0],
            hashed_password=hash_password(body.access_token),  # token is the initial password
            role=UserRole.candidate,
        )
        db.add(user)
        await db.flush()
    else:
        # User exists - verify they're a candidate
        if user.role != UserRole.candidate:
            raise HTTPException(
                status_code=403,
                detail="This email is registered as an interviewer. Please use the candidate login."
            )

    # Link candidate to session if not already linked
    if session.candidate_id is None:
        session.candidate_id = user.id
        if not session.candidate_name:
            session.candidate_name = user.full_name
        # Store candidate email in session for future validation
        if not session.candidate_email:
            session.candidate_email = user.email
    elif session.candidate_id != user.id:
        # Session is already linked to a different candidate
        raise HTTPException(
            status_code=403,
            detail="This session is already assigned to another candidate."
        )

    await db.commit()

    token = create_access_token(str(user.id), extra={"role": user.role, "session_id": str(session.id)})
    return TokenResponse(
        access_token=token,
        role=user.role,
        user_id=str(user.id),
        full_name=user.full_name,
    )


# ── Current user ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user


# ── OAuth: Google Login ───────────────────────────────────────────────────────

@router.get("/google/login")
async def google_login():
    """Initiate Google OAuth flow"""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    
    # Build Google OAuth authorization URL
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.OAUTH_REDIRECT_URI,  # No provider parameter here
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": "google"  # Use state parameter to identify provider
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/github/login")
async def github_login():
    """Initiate GitHub OAuth flow"""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="GitHub OAuth not configured")
    
    # Build GitHub OAuth authorization URL
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.OAUTH_REDIRECT_URI,  # No provider parameter here
        "scope": "user:email",
        "allow_signup": "true",
        "state": "github"  # Use state parameter to identify provider
    }
    
    auth_url = f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/oauth/callback")
async def oauth_callback(
    code: str,
    state: str,  # Changed from 'provider' to 'state'
    db: AsyncSession = Depends(get_db)
):
    """Handle OAuth callback and create/login user"""
    
    provider = state  # state contains 'google' or 'github'
    
    try:
        if provider == "google":
            # Exchange code for token
            token_url = "https://oauth2.googleapis.com/token"
            async with httpx.AsyncClient() as client:
                token_response = await client.post(
                    token_url,
                    data={
                        "code": code,
                        "client_id": settings.GOOGLE_CLIENT_ID,
                        "client_secret": settings.GOOGLE_CLIENT_SECRET,
                        "redirect_uri": settings.OAUTH_REDIRECT_URI,  # No provider parameter
                        "grant_type": "authorization_code"
                    }
                )
                token_data = token_response.json()
                
                if "error" in token_data:
                    raise HTTPException(status_code=400, detail=token_data.get("error_description", "OAuth failed"))
                
                # Get user info
                userinfo_response = await client.get(
                    "https://www.googleapis.com/oauth2/v2/userinfo",
                    headers={"Authorization": f"Bearer {token_data['access_token']}"}
                )
                user_info = userinfo_response.json()
                
                email = user_info.get("email")
                oauth_id = user_info.get("id")
                full_name = user_info.get("name", email.split("@")[0])
                profile_picture = user_info.get("picture")
                
        elif provider == "github":
            # Exchange code for token
            token_url = "https://github.com/login/oauth/access_token"
            async with httpx.AsyncClient() as client:
                token_response = await client.post(
                    token_url,
                    data={
                        "code": code,
                        "client_id": settings.GITHUB_CLIENT_ID,
                        "client_secret": settings.GITHUB_CLIENT_SECRET,
                        "redirect_uri": settings.OAUTH_REDIRECT_URI  # No provider parameter
                    },
                    headers={"Accept": "application/json"}
                )
                token_data = token_response.json()
                
                if "error" in token_data:
                    raise HTTPException(status_code=400, detail=token_data.get("error_description", "OAuth failed"))
                
                access_token = token_data.get("access_token")
                
                # Get user info
                userinfo_response = await client.get(
                    "https://api.github.com/user",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/vnd.github.v3+json"
                    }
                )
                user_info = userinfo_response.json()
                
                # Get primary email
                email_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/vnd.github.v3+json"
                    }
                )
                emails = email_response.json()
                primary_email = next((e["email"] for e in emails if e["primary"]), emails[0]["email"] if emails else None)
                
                email = primary_email
                oauth_id = str(user_info.get("id"))
                full_name = user_info.get("name") or user_info.get("login", email.split("@")[0])
                profile_picture = user_info.get("avatar_url")
        else:
            raise HTTPException(status_code=400, detail="Invalid OAuth provider")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by OAuth provider")
        
        # Check if user exists by email or oauth_id
        result = await db.execute(
            select(User).where(
                or_(
                    User.email == email,
                    (User.oauth_provider == provider) & (User.oauth_id == oauth_id)
                )
            )
        )
        user = result.scalar_one_or_none()
        
        if user:
            # Update OAuth info if needed
            if not user.oauth_provider:
                user.oauth_provider = provider
                user.oauth_id = oauth_id
            if profile_picture and not user.profile_picture:
                user.profile_picture = profile_picture
            await db.commit()
        else:
            # Create new user
            user = User(
                email=email,
                full_name=full_name,
                hashed_password=None,  # OAuth users don't need password
                role=UserRole.interviewer,
                oauth_provider=provider,
                oauth_id=oauth_id,
                profile_picture=profile_picture
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Account disabled")
        
        # Generate JWT token
        token = create_access_token(str(user.id), extra={"role": user.role})
        
        # Redirect back to frontend with token
        frontend_url = f"http://localhost:5173/auth/callback?token={token}&user_id={user.id}&full_name={user.full_name}&role={user.role}"
        return RedirectResponse(url=frontend_url)
        
    except HTTPException:
        raise
    except Exception as e:
        # Redirect to frontend with error
        error_url = f"http://localhost:5173/login?error={str(e)}"
        return RedirectResponse(url=error_url)
