package email

import (
	"fmt"
	"net/smtp"
	"stroy-control-backend/internal/config"
)

// EmailService handles email sending
type EmailService struct {
	config config.EmailConfig
}

// NewEmailService creates a new email service
func NewEmailService(cfg config.EmailConfig) *EmailService {
	return &EmailService{
		config: cfg,
	}
}

// SendPasswordResetEmail sends a password reset code
func (s *EmailService) SendPasswordResetEmail(toEmail, code string) error {
	if s.config.SMTPUsername == "" || s.config.SMTPPassword == "" {
		// If no SMTP config, fallback to logging (dev mode)
		fmt.Printf("==================================================\n")
		fmt.Printf("EMAIL SERVICE: Password Reset\n")
		fmt.Printf("To: %s\n", toEmail)
		fmt.Printf("Code: %s\n", code)
		fmt.Printf("==================================================\n")
		return nil
	}

	auth := smtp.PlainAuth("", s.config.SMTPUsername, s.config.SMTPPassword, s.config.SMTPHost)

	headers := make(map[string]string)
	headers["From"] = fmt.Sprintf("%s <%s>", s.config.FromName, s.config.FromAddress)
	headers["To"] = toEmail
	headers["Subject"] = "Сброс пароля | Строй-Контроль"
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	body := fmt.Sprintf(`
		<html>
		<body>
			<h2>Запрос на сброс пароля</h2>
			<p>Вы запросили сброс пароля для вашего аккаунта в системе Строй-Контроль.</p>
			<p>Ваш код подтверждения:</p>
			<h1 style="color: #2563eb; font-size: 32px; letter-spacing: 5px;">%s</h1>
			<p>Код действителен в течение 15 минут.</p>
			<p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
		</body>
		</html>
	`, code)

	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + body

	addr := fmt.Sprintf("%s:%d", s.config.SMTPHost, s.config.SMTPPort)
	
	// For development/testing without real SMTP server or if auth fails, we might want to log
	err := smtp.SendMail(addr, auth, s.config.FromAddress, []string{toEmail}, []byte(message))
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}
