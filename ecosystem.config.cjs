module.exports = {
  apps: [
    {
      name: 'zhou-backend',
      cwd: '/var/www/be-zhou',
      script: './dist/src/server.js',
      instances: 1, // Diturunkan dari 'max' ke 1 untuk stabilitas koneksi DB & RAM VPS 2 vCPU / 2GB (PM Audit)
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
