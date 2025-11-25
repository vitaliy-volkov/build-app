"""
Authentication and Authorization Middleware
"""
import jwt
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import redis.asyncio as redis
import json

from app.config import settings

security = HTTPBearer()

class JWTManager:
    """JWT Token Management"""
    
    def __init__(self):
        self.secret_key = settings.secret_key
        self.algorithm = "HS256"
        self.access_token_expire_minutes = settings.access_token_expire_minutes
        self.refresh_token_expire_days = 30
    
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check token type
            if payload.get("type") != token_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            # Check expiration
            if datetime.utcnow() > datetime.fromtimestamp(payload["exp"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token expired"
                )
                
            return payload
            
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

jwt_manager = JWTManager()

class RateLimiter:
    """Redis-based Rate Limiter"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.default_requests = settings.rate_limit_per_user
        self.default_window = settings.rate_limit_window
    
    async def is_allowed(
        self, 
        identifier: str, 
        requests: int = None, 
        window: int = None
    ) -> bool:
        """Check if request is allowed"""
        requests = requests or self.default_requests
        window = window or self.default_window
        
        key = f"rate_limit:{identifier}"
        current = await self.redis.incr(key)
        
        if current == 1:
            await self.redis.expire(key, window)
        
        return current <= requests
    
    async def get_remaining_requests(
        self, 
        identifier: str, 
        requests: int = None, 
        window: int = None
    ) -> int:
        """Get remaining requests"""
        requests = requests or self.default_requests
        key = f"rate_limit:{identifier}"
        current = await self.redis.get(key)
        
        if not current:
            return requests
        
        return max(0, requests - int(current))

class AuthenticationMiddleware(BaseHTTPMiddleware):
    """Authentication and Rate Limiting Middleware"""
    
    def __init__(self, app, redis_client: redis.Redis):
        super().__init__(app)
        self.redis = redis_client
        self.rate_limiter = RateLimiter(redis_client)
        # Skip auth for these paths
        self.skip_auth_paths = [
            "/health",
            "/metrics",
            "/docs",
            "/openapi.json",
            "/favicon.ico",
            "/static"
        ]
        # Skip rate limiting for these paths
        self.skip_rate_limit_paths = [
            "/health",
            "/metrics",
            "/docs",
            "/openapi.json"
        ]
    
    async def dispatch(self, request: Request, call_next):
        """Process request through middleware"""
        
        # Add security headers
        response = Response()
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Skip authentication for certain paths
        if request.url.path in self.skip_auth_paths:
            return await call_next(request)
        
        # Get token from Authorization header
        authorization = request.headers.get("Authorization")
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required"
            )
        
        token = authorization.split(" ")[1]
        
        # Verify JWT token
        try:
            payload = jwt_manager.verify_token(token, "access")
            user_id = payload.get("sub")
            user_role = payload.get("role", "user")
            
            # Add user info to request state
            request.state.user_id = user_id
            request.state.user_role = user_role
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token validation failed"
            )
        
        # Rate limiting
        if request.url.path not in self.skip_rate_limit_paths:
            identifier = f"user:{user_id}"
            
            # Different limits for different roles
            if user_role == "admin":
                requests_per_window = 1000
            elif user_role == "premium":
                requests_per_window = 500
            else:
                requests_per_window = settings.rate_limit_per_user
            
            if not await self.rate_limiter.is_allowed(identifier, requests_per_window):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded"
                )
            
            # Add rate limit headers
            remaining = await self.rate_limiter.get_remaining_requests(identifier, requests_per_window)
            response.headers["X-RateLimit-Limit"] = str(requests_per_window)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(int(time.time()) + settings.rate_limit_window)
        
        # Process request
        response = await call_next(request)
        
        # Add security headers to response
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        return response

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current user from JWT token"""
    try:
        payload = jwt_manager.verify_token(credentials.credentials, "access")
        return {
            "user_id": payload.get("sub"),
            "user_role": payload.get("role", "user"),
            "permissions": payload.get("permissions", [])
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

async def get_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Get current user with admin role verification"""
    if current_user.get("user_role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# Mock user database for development
MOCK_USERS = {
    "admin": {
        "user_id": "admin",
        "password": "admin123",  # In production, use hashed passwords
        "role": "admin",
        "permissions": ["read", "write", "delete", "admin"]
    },
    "user": {
        "user_id": "user",
        "password": "user123",
        "role": "user", 
        "permissions": ["read", "write"]
    },
    "premium": {
        "user_id": "premium",
        "password": "premium123",
        "role": "premium",
        "permissions": ["read", "write", "premium_features"]
    }
}

def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate user (mock implementation)"""
    user = MOCK_USERS.get(username)
    if user and user["password"] == password:
        return user
    return None
