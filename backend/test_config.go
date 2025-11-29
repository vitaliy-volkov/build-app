package main

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	Server ServerConfig `mapstructure:"server"`
}

type ServerConfig struct {
	Port int `mapstructure:"port"`
}

func main() {
	viper.SetDefault("server.port", 8080)
	viper.AutomaticEnv()

    // Simulate what's in the repo
    // viper.SetEnvKeyReplacer(strings.NewReplacer(".", "_")) // This is missing in repo

	os.Setenv("SERVER_PORT", "9090")

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		panic(err)
	}

	fmt.Printf("Port: %d\n", config.Server.Port)
}
