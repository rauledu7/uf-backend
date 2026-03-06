module.exports = {
  apps: [
    {
      name: 'ultimate_api_develop',
      script: './build/server.js',
      instances: '1',
      exec_mode: 'fork',
      cron_restart: '0 3 * * *',
      autorestart: true,
      max_memory_restart: '2G',
      watch: false,
      output: './logs/ultimate_api_develop.log', // salida estándar
      error: './logs/ultimate_api_develop.error.log', // errores
      merge_logs: true, // combina stdout y stderr si quieres
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'ultimate_api_production',
      script: './build/server.js',
      instances: '1',
      exec_mode: 'fork',
      cron_restart: '0 3 * * *',
      autorestart: true,
      max_memory_restart: '2G',
      watch: false,
      output: './logs/ultimate_api_production.log',
      error: './logs/ultimate_api_production.error.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
