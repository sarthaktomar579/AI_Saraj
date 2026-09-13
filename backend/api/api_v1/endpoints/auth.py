from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.database import get_db
from core.security import verify_password, get_password_hash, create_access_token
from core.config import settings
from models.user import User
from schemas.user import UserCreate, User as UserSchema, Token, UserUpdate, GoogleLoginRequest
from fastapi.security import OAuth2PasswordRequestForm
from typing import Any
import secrets
import json
import urllib.request
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserSchema)
@router.post("/register/", response_model=UserSchema)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)) -> Any:
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    result = await db.execute(select(User).where(User.username == user_in.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already taken")

    # Normalize candidate/student role
    role = 'student' if (user_in.role or '').lower() in ['candidate', 'student'] else user_in.role

    # Create user
    db_user = User(
        email=user_in.email,
        username=user_in.username,
        password=get_password_hash(user_in.password),
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        role=role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.post("/login", response_model=Token)
@router.post("/login/", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)) -> Any:
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/google", response_model=Token)
@router.post("/google/", response_model=Token)
async def google_auth(payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)) -> Any:
    try:
        if payload.access_token:
            # Query Google UserInfo API using access_token
            req = urllib.request.Request(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={
                    "Authorization": f"Bearer {payload.access_token}",
                    "User-Agent": "AISaraj-Auth/1.0",
                }
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                idinfo = json.loads(response.read().decode("utf-8"))
        elif payload.credential:
            # Verify the Google ID token with Google's public keys
            idinfo = id_token.verify_oauth2_token(
                payload.credential,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )
        else:
            raise HTTPException(status_code=400, detail="Either credential or access_token must be provided")

        email = idinfo.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google account does not contain an email")
        raw_first_name = (idinfo.get("given_name") or idinfo.get("name") or "").strip()
        first_name = raw_first_name.split()[0] if raw_first_name else ""
        last_name = (idinfo.get("family_name") or "").strip()
        picture = idinfo.get("picture", None)
    except urllib.error.HTTPError as he:
        error_body = he.read().decode("utf-8", errors="ignore")
        print(f"[Google Auth HTTPError]: {he.code} - {error_body}", flush=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Google verification failed: {error_body or he.reason}")
    except Exception as e:
        print(f"[Google Auth Exception]: {type(e).__name__} - {str(e)}", flush=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid Google token: {str(e)}")

    try:
        # Check if user with this email already exists
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        is_new_user = False
        if not user:
            is_new_user = True
            # Create a unique username based on email
            base_username = email.split("@")[0].replace(".", "_")
            username = base_username
            suffix = 1
            while True:
                existing = await db.execute(select(User).where(User.username == username))
                if not existing.scalars().first():
                    break
                username = f"{base_username}_{suffix}"
                suffix += 1

            # Normalize role
            chosen_role = 'student' if (payload.role or '').lower() in ['candidate', 'student'] else (payload.role or "student")

            # Create user with an unguessable password hash
            user = User(
                email=email,
                username=username,
                password=get_password_hash(secrets.token_urlsafe(32)),
                first_name=first_name,
                last_name=last_name,
                role=chosen_role,
                avatar_url=picture,
                is_verified=True,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # Sync profile image and names if not present
            changed = False
            if not user.avatar_url and picture:
                user.avatar_url = picture
                changed = True
            if not user.first_name and first_name:
                user.first_name = first_name
                changed = True
            if not user.last_name and last_name:
                user.last_name = last_name
                changed = True
            if changed:
                db.add(user)
                await db.commit()
                await db.refresh(user)

        access_token = create_access_token(subject=user.id)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "is_new_user": is_new_user,
            "role": user.role
        }
    except Exception as db_err:
        await db.rollback()
        print(f"[Google Auth DB Error]: {db_err}", flush=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error during Google sign-in: {str(db_err)}")

@router.get("/me", response_model=UserSchema)
@router.get("/me/", response_model=UserSchema)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> Any:
    return current_user

@router.put("/me", response_model=UserSchema)
@router.put("/me/", response_model=UserSchema)
async def update_current_user_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    update_data = user_in.model_dump(exclude_unset=True)
    if 'role' in update_data and (update_data['role'] or '').lower() in ['candidate', 'student']:
        update_data['role'] = 'student'
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user
