package auth

import (
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"stroy-control-backend/internal/config"
	"stroy-control-backend/internal/models"
)

// JWTService сервис для работы с JWT токенами
type JWTService struct {
	config *config.JWTConfig
}

// TokenPair пара токенов (access + refresh)
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
}

// Claims структура для JWT claims
type Claims struct {
	UserID   string   `json:"user_id"`
	Email    string   `json:"email"`
	Role     string   `json:"role"`
	CompanyID *string `json:"company_id,omitempty"`
	jwt.RegisteredClaims
}

// NewJWTService создает новый экземпляр JWT сервиса
func NewJWTService(cfg *config.Config) *JWTService {
	return &JWTService{
		config: &cfg.JWT,
	}
}

// GenerateTokens генерирует пару токенов для пользователя
func (s *JWTService) GenerateTokens(user *models.User) (*TokenPair, error) {
	now := time.Now()
	
	// Access Token (15 минут)
	accessClaims := Claims{
		UserID:   user.ID,
		Email:    user.Email,
		Role:     string(user.Role),
		CompanyID: user.CompanyID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(s.config.AccessTokenTTL)),
			NotBefore: jwt.NewNumericDate(now),
			IssuedAt:  jwt.NewNumericDate(now),
			Issuer:    s.config.Issuer,
			Subject:   user.ID,
		},
	}

	accessToken, err := s.generateToken(accessClaims)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	// Refresh Token (7 дней)
	refreshClaims := jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(now.Add(s.config.RefreshTokenTTL)),
		NotBefore: jwt.NewNumericDate(now),
		IssuedAt:  jwt.NewNumericDate(now),
		Issuer:    s.config.Issuer,
		Subject:   user.ID,
	}

	refreshToken, err := s.generateRefreshToken(refreshClaims)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.config.AccessTokenTTL.Seconds()),
	}, nil
}

// generateToken генерирует JWT токен
func (s *JWTService) generateToken(claims Claims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.Secret))
}

// generateRefreshToken генерирует refresh token (упрощенный формат)
func (s *JWTService) generateRefreshToken(claims jwt.RegisteredClaims) (string, error) {
	// Для refresh token используем упрощенную структуру
	refreshClaims := jwt.MapClaims{
		"sub":    claims.Subject,
		"iss":    claims.Issuer,
		"exp":    claims.ExpiresAt,
		"nbf":    claims.NotBefore,
		"iat":    claims.IssuedAt,
		"type":   "refresh",
		"jti":    generateJTI(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	return token.SignedString([]byte(s.config.Secret))
}

// ValidateAccessToken проверяет access token и возвращает claims
func (s *JWTService) ValidateAccessToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.Secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}

	// Проверяем срок действия
	if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("token expired")
	}

	// Проверяем issuer
	if claims.Issuer != s.config.Issuer {
		return nil, fmt.Errorf("invalid token issuer")
	}

	return claims, nil
}

// ValidateRefreshToken проверяет refresh token
func (s *JWTService) ValidateRefreshToken(tokenString string) (*jwt.RegisteredClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.Secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse refresh token: %w", err)
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid refresh token")
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok {
		return nil, fmt.Errorf("invalid refresh token claims")
	}

	// Проверяем срок действия
	if claims.ExpiresAt != nil && claims.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("refresh token expired")
	}

	// Проверяем issuer
	if claims.Issuer != s.config.Issuer {
		return nil, fmt.Errorf("invalid refresh token issuer")
	}

	return claims, nil
}

// RefreshTokens обновляет токены используя refresh token
func (s *JWTService) RefreshTokens(refreshToken string, user *models.User) (*TokenPair, error) {
	// Валидируем refresh token
	claims, err := s.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	// Проверяем, что пользователь соответствует токену
	if claims.Subject != user.ID {
		return nil, fmt.Errorf("refresh token user mismatch")
	}

	// Генерируем новую пару токенов
	return s.GenerateTokens(user)
}

// ExtractTokenFromHeader извлекает токен из Authorization header
func (s *JWTService) ExtractTokenFromHeader(authHeader string) (string, error) {
	if authHeader == "" {
		return "", fmt.Errorf("authorization header is empty")
	}

	// Ожидаем формат: "Bearer <token>"
	const prefix = "Bearer "
	if len(authHeader) <= len(prefix) || authHeader[:len(prefix)] != prefix {
		return "", fmt.Errorf("invalid authorization header format")
	}

	return authHeader[len(prefix):], nil
}

// GetTokenExpirationTime возвращает время истечения токена в Unix timestamp
func (s *JWTService) GetTokenExpirationTime(tokenString string) (int64, error) {
	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, &Claims{})
	if err != nil {
		return 0, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || claims.ExpiresAt == nil {
		return 0, fmt.Errorf("invalid token or missing expiration")
	}

	return claims.ExpiresAt.Unix(), nil
}

// generateJTI генерирует уникальный ID для токена (JWT ID)
func generateJTI() string {
	token, err := models.GenerateSecureToken(16)
	if err != nil {
		// Fallback к времени в наносекундах
		return strconv.FormatInt(time.Now().UnixNano(), 16)
	}
	return token
}