package config

import (
    "fmt"
    "net/url"
    "os"
    "strconv"
    "strings"
    "time"

    "github.com/spf13/viper"
)

type Config struct {
    Server   ServerConfig   `mapstructure:"server"`
    Database DatabaseConfig `mapstructure:"database"`
    JWT      JWTConfig      `mapstructure:"jwt"`
    Redis    RedisConfig    `mapstructure:"redis"`
    AI       AIConfig       `mapstructure:"ai"`
    Email    EmailConfig    `mapstructure:"email"`
    CORS     CORSConfig     `mapstructure:"cors"`
}

type CORSConfig struct {
    AllowedOrigins []string `mapstructure:"allowed_origins"`
}

type EmailConfig struct {
    SMTPHost     string `mapstructure:"smtp_host"`
    SMTPPort     int    `mapstructure:"smtp_port"`
    SMTPUsername string `mapstructure:"smtp_username"`
    SMTPPassword string `mapstructure:"smtp_password"`
    FromAddress  string `mapstructure:"from_address"`
    FromName     string `mapstructure:"from_name"`
}

type ServerConfig struct {
    Port         int           `mapstructure:"port"`
    ReadTimeout  time.Duration `mapstructure:"read_timeout"`
    WriteTimeout time.Duration `mapstructure:"write_timeout"`
}

type DatabaseConfig struct {
    Host     string `mapstructure:"host"`
    Port     int    `mapstructure:"port"`
    User     string `mapstructure:"user"`
    Password string `mapstructure:"password"`
    DBName   string `mapstructure:"dbname"`
    SSLMode  string `mapstructure:"ssl_mode"`
}

type JWTConfig struct {
    Secret          string        `mapstructure:"secret"`
    AccessTokenTTL  time.Duration `mapstructure:"access_token_ttl"`
    RefreshTokenTTL time.Duration `mapstructure:"refresh_token_ttl"`
    Issuer          string        `mapstructure:"issuer"`
}

type RedisConfig struct {
    Host     string `mapstructure:"host"`
    Port     int    `mapstructure:"port"`
    Password string `mapstructure:"password"`
    DB       int    `mapstructure:"db"`
}

type AIConfig struct {
    GatewayURL string `mapstructure:"gateway_url"`
    APIKey     string `mapstructure:"api_key"`
}

func Load() (*Config, error) {
    viper.SetConfigName("config")
    viper.SetConfigType("yaml")
    viper.AddConfigPath(".")
    viper.AddConfigPath("./config")

    viper.SetDefault("server.port", 8080)
    viper.SetDefault("server.read_timeout", 10*time.Second)
    viper.SetDefault("server.write_timeout", 10*time.Second)

    // Database defaults
    viper.SetDefault("database.host", "localhost")
    viper.SetDefault("database.port", 5432)
    viper.SetDefault("database.user", "stroy_user")
    viper.SetDefault("database.password", "stroy_password")
    viper.SetDefault("database.dbname", "stroy_control")
    viper.SetDefault("database.ssl_mode", "disable")

    // JWT defaults
    viper.SetDefault("jwt.secret", "your-super-secret-jwt-key-change-in-production")
    viper.SetDefault("jwt.access_token_ttl", 15*time.Minute)  // 15 minutes
    viper.SetDefault("jwt.refresh_token_ttl", 7*24*time.Hour) // 7 days
    viper.SetDefault("jwt.issuer", "stroy-control-backend")

    // Redis defaults
    viper.SetDefault("redis.host", "localhost")
    viper.SetDefault("redis.port", 6379)
    viper.SetDefault("redis.password", "")
    viper.SetDefault("redis.db", 0)

    // AI defaults
    viper.SetDefault("ai.gateway_url", "https://api.openai.com/v1")
    viper.SetDefault("ai.api_key", "")

    // Email defaults
    viper.SetDefault("email.smtp_host", "smtp.gmail.com")
    viper.SetDefault("email.smtp_port", 587)
    viper.SetDefault("email.smtp_username", "")
    viper.SetDefault("email.smtp_password", "")
    viper.SetDefault("email.from_address", "noreply@stroy-control.ru")
    viper.SetDefault("email.from_name", "Строй-Контроль")

    // CORS defaults
    viper.SetDefault("cors.allowed_origins", []string{"*"})

    viper.AutomaticEnv()
    viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))

    if err := viper.ReadInConfig(); err != nil {
        // It's okay if config file doesn't exist, we fallback to env or defaults
        if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
            return nil, fmt.Errorf("failed to read config: %w", err)
        }
    }

    var config Config
    if err := viper.Unmarshal(&config); err != nil {
        return nil, fmt.Errorf("failed to unmarshal config: %w", err)
    }

    // Override with Railway env vars
    if portStr := os.Getenv("PORT"); portStr != "" {
        if port, err := strconv.Atoi(portStr); err == nil {
            config.Server.Port = port
        }
    }

    if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
        if u, err := url.Parse(dbURL); err == nil {
            config.Database.Host = u.Hostname()
            if port := u.Port(); port != "" {
                if p, err := strconv.Atoi(port); err == nil {
                    config.Database.Port = p
                }
            }
            config.Database.User = u.User.Username()
            if password, ok := u.User.Password(); ok {
                config.Database.Password = password
            }
            config.Database.DBName = strings.TrimPrefix(u.Path, "/")
            config.Database.SSLMode = "require"
        }
    }

    if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
        if u, err := url.Parse(redisURL); err == nil {
            config.Redis.Host = u.Hostname()
            if port := u.Port(); port != "" {
                if p, err := strconv.Atoi(port); err == nil {
                    config.Redis.Port = p
                }
            }
            if password, ok := u.User.Password(); ok {
                config.Redis.Password = password
            }
            if len(u.Path) > 1 {
                if db, err := strconv.Atoi(strings.TrimPrefix(u.Path, "/")); err == nil {
                    config.Redis.DB = db
                }
            }
        }
    }

    if corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS"); corsOrigins != "" {
        origins := strings.Split(corsOrigins, ",")
        for i, o := range origins {
            origins[i] = strings.TrimSpace(o)
        }
        config.CORS.AllowedOrigins = origins
    }

    return &config, nil
}
