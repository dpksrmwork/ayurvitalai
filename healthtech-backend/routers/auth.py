from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime

from database import get_db
from models.user import User, RefreshToken, UserRole
from models.doctor import DoctorProfile
from models.patient import PatientProfile
from schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserMeResponse
from services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from dependencies import get_current_user
from config import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Check if role is valid
    if request.role not in [UserRole.DOCTOR, UserRole.PATIENT, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'doctor', 'patient', or 'admin'"
        )

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create new user
    new_user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        role=request.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create profile depending on role
    if request.role == UserRole.DOCTOR:
        doctor_profile = DoctorProfile(
            user_id=new_user.id,
            full_name=request.full_name,
            license_number=f"PENDING_{new_user.id}" # Temporary unique placeholder
        )
        db.add(doctor_profile)
    elif request.role == UserRole.PATIENT:
        patient_profile = PatientProfile(
            user_id=new_user.id,
            full_name=request.full_name
        )
        db.add(patient_profile)
        
    db.commit()
    
    return {"message": "User registered successfully"}

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is inactive"
        )

    # Generate tokens
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.email})

    # Save refresh token in DB
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at
    )
    db.add(db_refresh_token)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshRequest, db: Session = Depends(get_db)):
    payload = verify_token(request.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == request.refresh_token,
        RefreshToken.is_revoked == False
    ).first()

    if not db_token or db_token.expires_at < datetime.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired or invalid refresh token"
        )

    user = db_token.user
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive or not found"
        )

    # Generate new access token
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    
    # Rotate refresh token (optional, but good practice. Here we just rotate)
    new_refresh_token = create_refresh_token(data={"sub": user.email})
    
    # Revoke old token
    db_token.is_revoked = True
    
    # Save new refresh token
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_db_token = RefreshToken(
        user_id=user.id,
        token=new_refresh_token,
        expires_at=expires_at
    )
    db.add(new_db_token)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(request: RefreshRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == request.refresh_token,
        RefreshToken.user_id == current_user.id
    ).first()

    if db_token:
        db_token.is_revoked = True
        db.commit()

    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserMeResponse)
async def me(current_user: User = Depends(get_current_user)):
    full_name = "Admin"
    if current_user.role == UserRole.DOCTOR and current_user.doctor_profile:
        full_name = current_user.doctor_profile.full_name
    elif current_user.role == UserRole.PATIENT and current_user.patient_profile:
        full_name = current_user.patient_profile.full_name

    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "full_name": full_name
    }
