package models

import (
	"time"

	"gorm.io/gorm"
)

type TransactionType string

const (
	TransactionTypeIncome   TransactionType = "income"
	TransactionTypeExpense  TransactionType = "expense"
	TransactionTypeTransfer TransactionType = "transfer"
)

type TransactionStatus string

const (
	TransactionStatusDraft    TransactionStatus = "draft"
	TransactionStatusPending  TransactionStatus = "pending"
	TransactionStatusApproved TransactionStatus = "approved"
	TransactionStatusPaid     TransactionStatus = "paid"
	TransactionStatusRejected TransactionStatus = "rejected"
)

// Transaction represents a financial transaction
type Transaction struct {
	ID              string            `json:"id" gorm:"primaryKey;type:uuid"`
	CompanyID       string            `json:"company_id" gorm:"type:uuid;not null;index"`
	ProjectID       *string           `json:"project_id" gorm:"type:uuid;index"`
	EstimateID      *string           `json:"estimate_id" gorm:"type:uuid"`
	Date            time.Time         `json:"date" gorm:"not null"`
	Amount          float64           `json:"amount" gorm:"not null;type:decimal(15,2)"`
	Type            TransactionType   `json:"type" gorm:"not null;type:varchar(20)"`   // income, expense
	Status          TransactionStatus `json:"status" gorm:"not null;type:varchar(20)"` // paid, pending
	Description     string            `json:"description" gorm:"type:text"`
	Comment         string            `json:"comment" gorm:"type:text"`
	
	// Metadata
	CreatedBy       string            `json:"created_by" gorm:"type:uuid"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
	DeletedAt       gorm.DeletedAt    `json:"-" gorm:"index"`

	// Relations
	Project         *Project          `json:"project,omitempty" gorm:"foreignKey:ProjectID"`
}

// TableName overrides the table name used by User to `transactions`
func (Transaction) TableName() string {
	return "transactions"
}

// BeforeCreate hook to generate UUID
func (t *Transaction) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = generateUUID()
	}
	return nil
}
