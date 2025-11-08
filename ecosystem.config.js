module.exports = {
  apps: [
    {
      name: 'silver-arcade-server',
      script: 'server.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Enable clustering for better performance and scalability
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      // Auto restart configuration
      autorestart: true,
      watch: false, // Disable file watching in production
      max_memory_restart: '1G', // Restart if memory usage exceeds 1GB
      restart_delay: 4000, // Delay between restarts
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Environment variables
      env_file: '.env',
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Performance optimizations
      node_args: '--max-old-space-size=4096', // Increase heap size to 4GB
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
