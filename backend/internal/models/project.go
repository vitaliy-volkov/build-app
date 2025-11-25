package models

import (
	"time"

	"gorm.io/gorm"
)

// ProjectStatus определяет статус проекта
type ProjectStatus string

const (
	StatusDraft      ProjectStatus = "draft"
	StatusPlanned    ProjectStatus = "planned"
	StatusInProgress ProjectStatus = "in_progress"
	StatusCompleted  ProjectStatus = "completed"
	StatusOnHold     ProjectStatus = "on_hold"
	StatusCancelled  ProjectStatus = "cancelled"
	StatusArchived   ProjectStatus = "archived"
)

// Project представляет строительный проект
type Project struct {
	ID                  string        `json:"id" gorm:"primaryKey;type:uuid"`
	CompanyID           string        `json:"company_id" gorm:"type:uuid;not null;index"` // Владелец компании/тенант
	Name                string        `json:"name" gorm:"not null;type:varchar(255)"`
	Address             string        `json:"address" gorm:"not null;type:text"`
	ContractNumber      string        `json:"contract_number" gorm:"not null;type:varchar(100)"`
	ContractDate        time.Time     `json:"contract_date" gorm:"not null"`
	Description         string        `json:"description" gorm:"type:text"`
	CustomerID          *string       `json:"customer_id" gorm:"type:uuid"`           // Компания-заказчик
	GeneralContractorID *string       `json:"general_contractor_id" gorm:"type:uuid"` // Генподрядчик
	ContactPersonID     *string       `json:"contact_person_id" gorm:"type:uuid"`     // Контактное лицо
	Status              ProjectStatus `json:"status" gorm:"not null;type:varchar(50);default:'draft'"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`

	// Связи с другими таблицами
	Company  Company         `json:"company,omitempty" gorm:"foreignKey:CompanyID"`
	Customer *Company        `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`
	Team     []ProjectMember `json:"team,omitempty" gorm:"foreignKey:ProjectID"`
}

// TableName возвращает имя таблицы для GORM
func (Project) TableName() string {
	return "projects"
}

// BeforeCreate хук для GORM
func (p *Project) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = generateUUID()
	}
	return nil
}

// ProjectMember представляет члена команды проекта
type ProjectMember struct {
	ProjectID string    `json:"project_id" gorm:"type:uuid;not null"`
	UserID    string    `json:"user_id" gorm:"type:uuid;not null"`
	Role      string    `json:"role" gorm:"type:varchar(100)"` // Конкретная роль в этом проекте
	JoinedAt  time.Time `json:"joined_at"`

	// Связи
	Project Project `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
	User    User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName возвращает имя таблицы для GORM
func (ProjectMember) TableName() string {
	return "project_team"
}

// Composite primary key для ProjectMember
func (ProjectMember) BeforeCreate(tx *gorm.DB) error {
	return nil
}
