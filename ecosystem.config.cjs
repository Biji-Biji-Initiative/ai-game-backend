module.exports = {
  apps: [
    {
      name: "ai-fight-club-api",
      script: "src/server.js",
      node_args: "--experimental-loader=./src/importResolver.js --require dotenv/config",
      
      wait_ready: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      max_restarts: 10,
      autorestart: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/error.log",
      out_file: "logs/output.log",
      merge_logs: true,
      restart_delay: 3000,
      
      env: {
        NODE_ENV: "development",
        PORT: 3000,
        BASE_URL: "http://localhost:3000",
        SUPABASE_URL: "https://dvmfpddmnzaxjmxxpupk.supabase.co",
        SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bWZwZGRtbnpheGpteHhwdXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NDA3MTAsImV4cCI6MjA1ODIxNjcxMH0.99b38YXJbbNC8kjRpqQq96k0zaB5qwQ2vvcFdxHPH9Y",
        instances: 1,
        exec_mode: "fork",
        watch: ["src"],
        ignore_watch: ["node_modules", "logs", ".git", "*.log", "tests", "api-tester-ui"]
      },
      
      env_production: {
        NODE_ENV: "production",
        PORT: 9000,
        BASE_URL: "https://api.aifightclub.example.com",
        instances: "max",
        exec_mode: "cluster",
        max_memory_restart: "1G",
        watch: false
      },
      
      env_testing: {
        NODE_ENV: "testing",
        PORT: 3002,
        BASE_URL: "http://localhost:3002",
        instances: 1,
        exec_mode: "fork",
        watch: false
      }
    }
  ]
}; 