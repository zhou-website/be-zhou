module.exports = {
  apps: [
    {
      name: 'zhou-backend',
      script: './dist/server.js',
      instances: 'max', // Memanfaatkan 2 vCPU Biznet Gio
      exec_mode: 'cluster',
      max_memory_restart: '800M', // Sesuai PRD Arsitektur (max-memory-restart: 800MB)
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
