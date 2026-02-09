package models

import (
	"time"

	"gorm.io/gorm"
)

// UserRole определяет роль пользователя в системе
type UserRole string

const (
	RoleUser           UserRole = "user"
	RoleAdmin          UserRole = "admin"
	RoleDirector       UserRole = "director"
	RoleProjectManager UserRole = "project_manager"
	RoleManager        UserRole = "manager"
	RoleForeman        UserRole = "foreman"
	RoleEstimator      UserRole = "estimator"
	RoleSupplyManager  UserRole = "supply_manager"
	RoleClient         UserRole = "client"
)

// User представляет пользователя системы
type User struct {
	ID           string         `json:"id" gorm:"primaryKey;type:uuid"`
	Email        string         `json:"email" gorm:"uniqueIndex;not null;type:varchar(255)"`
	Name         string         `json:"name" gorm:"not null;type:varchar(255)"`
	PasswordHash string         `json:"-" gorm:"column:password_hash;not null;type:varchar(255)"` // не возвращается в JSON
	Role         UserRole       `json:"role" gorm:"not null;type:varchar(50)"`
	CompanyID    *string        `json:"company_id" gorm:"type:uuid"`
	AvatarURL    *string        `json:"avatar_url" gorm:"type:text"`
	Phone        *string        `json:"phone" gorm:"type:varchar(50)"`
	IsActive     bool           `json:"is_active" gorm:"default:true"`
	LastLoginAt  *time.Time     `json:"last_login_at"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`

	// Связи с другими таблицами
	Company Company `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
}

// TableName возвращает имя таблицы для GORM
func (User) TableName() string {
	return "users"
}

// BeforeCreate хук для GORM, выполняется перед созданием записи
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = generateUUID()
	}
	return nil
}
