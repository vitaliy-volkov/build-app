package models

import (
	"time"

	"gorm.io/gorm"
)

// Company представляет компанию в системе
type Company struct {
	ID      string `json:"id" gorm:"primaryKey;type:uuid"`
	Name    string `json:"name" gorm:"not null;type:varchar(255)"`
	Address string `json:"address" gorm:"type:text"`
	INN     string `json:"inn" gorm:"type:varchar(20)"`
	KPP     string `json:"kpp" gorm:"type:varchar(20)"`
	OGRN    string `json:"ogrn" gorm:"type:varchar(20)"`
	Email   string `json:"email" gorm:"type:varchar(255)"`
	Phone   string `json:"phone" gorm:"type:varchar(50)"`
	Website string `json:"website" gorm:"type:varchar(255)"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// TableName возвращает имя таблицы для GORM
func (Company) TableName() string {
	return "companies"
}

// BeforeCreate хук для GORM
func (c *Company) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = generateUUID()
	}
	return nil
}
