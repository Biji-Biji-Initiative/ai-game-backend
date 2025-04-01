module.exports = {
  apps: [
    {
      name: "ai-fight-club-api",
      script: "src/index.js",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        BASE_URL: "http://localhost:3000"
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 9000,
        BASE_URL: "https://api.aifightclub.example.com"
      },
      env_testing: {
        NODE_ENV: "testing",
        PORT: 3002,
        BASE_URL: "http://localhost:3002"
      },
      watch: ["src"],
      ignore_watch: ["node_modules", "logs", ".git", "*.log", "tests", "api-tester-ui"],
      instances: "max",
      exec_mode: "cluster",
      max_memory_restart: "1G",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/error.log",
      out_file: "logs/output.log",
      merge_logs: true,
      restart_delay: 3000,
      wait_ready: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      max_restarts: 10,
      autorestart: true,
      env_production: {
        NODE_ENV: "production",
        PORT: 9000,
        BASE_URL: "https://api.aifightclub.example.com",
        instances: "max",
        exec_mode: "cluster"
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
        BASE_URL: "http://localhost:3000",
        instances: 1,
        exec_mode: "fork",
        watch: ["src"],
        watch_options: {
          followSymlinks: false
        }
      },
      env_testing: {
        NODE_ENV: "testing",
        PORT: 3002,
        BASE_URL: "http://localhost:3002",
        instances: 1,
        exec_mode: "fork"
      }
    }
  ]
}; 