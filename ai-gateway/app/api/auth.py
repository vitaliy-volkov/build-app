"""
Authentication API endpoints
"""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
import time

from app.middleware.auth import (
    jwt_manager, 
    authenticate_user,
    get_current_user,
    get_admin_user
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user_info: Dict[str, Any]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    user_id: str
    role: str
    permissions: list

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Authenticate user and return tokens"""
    user = authenticate_user(request.username, request.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create tokens
    access_token = jwt_manager.create_access_token({
        "sub": user["user_id"],
        "role": user["role"],
        "permissions": user["permissions"]
    })
    
    refresh_token = jwt_manager.create_refresh_token({
        "sub": user["user_id"],
        "role": user["role"],
        "permissions": user["permissions"]
    })
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user_info={
            "user_id": user["user_id"],
            "role": user["role"],
            "permissions": user["permissions"]
        }
    )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    try:
        payload = jwt_manager.verify_token(request.refresh_token, "refresh")
        
        # Create new access token
        access_token = jwt_manager.create_access_token({
            "sub": payload["sub"],
            "role": payload["role"],
            "permissions": payload["permissions"]
        })
        
        # Optionally create new refresh token
        new_refresh_token = jwt_manager.create_refresh_token({
            "sub": payload["sub"],
            "role": payload["role"],
            "permissions": payload["permissions"]
        })
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
            user_info={
                "user_id": payload["sub"],
                "role": payload["role"],
                "permissions": payload["permissions"]
            }
        )
        
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user information"""
    return UserResponse(
        user_id=current_user["user_id"],
        role=current_user["user_role"],
        permissions=current_user["permissions"]
    )

@router.post("/logout")
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout user (token invalidation would need Redis/blacklist in production)"""
    # In a real implementation, you would add the token to a blacklist
    return {"message": "Successfully logged out"}

@router.get("/admin-only")
async def admin_only_endpoint(admin_user: Dict[str, Any] = Depends(get_admin_user)):
    """Example admin-only endpoint"""
    return {
        "message": "Admin access granted",
        "user_id": admin_user["user_id"],
        "admin_features": ["user_management", "system_settings", "analytics"]
    }

# Development endpoints for testing
@router.post("/dev/create-user")
async def create_dev_user(username: str, role: str = "user"):
    """Create development user (for testing only)"""
    if settings.debug:
        from app.middleware.auth import MOCK_USERS
        MOCK_USERS[username] = {
            "user_id": username,
            "password": "dev123",  # Default dev password
            "role": role,
            "permissions": ["read", "write"] if role == "user" else ["read", "write", "admin"]
        }
        return {"message": f"Development user '{username}' created with role '{role}'"}
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Development endpoint not available in production"
        )
