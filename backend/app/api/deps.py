from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.base import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_exc
    return user


async def require_interviewer(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.interviewer, UserRole.admin):
        raise HTTPException(status_code=403, detail="Interviewers only")
    return current_user


async def require_candidate(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.candidate:
        raise HTTPException(status_code=403, detail="Candidates only")
    return current_user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admins only")
    return current_user


async def get_session_for_user(session_id, db: AsyncSession, user: User):
    """Load an interview session the user participates in (owner interviewer,
    assigned candidate, or admin). 404 if missing, 403 otherwise."""
    from app.models.session import InterviewSession

    sess = (await db.execute(
        select(InterviewSession).where(InterviewSession.id == session_id)
    )).scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    if user.role != UserRole.admin and user.id not in (sess.interviewer_id, sess.candidate_id):
        raise HTTPException(status_code=403, detail="Not your session")
    return sess
