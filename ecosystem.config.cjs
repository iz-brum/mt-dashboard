module.exports = {
  apps: [
    {
      name: 'frontend',
      script: 'npm.cmd',
      args: 'run start',
      cwd: './',
      env: {
        NODE_ENV: 'development'
      },
      interpreter: 'none',
      watch: false,
      ignore_watch: ["public/data/**", "public/dist/**", "node_modules/**"]
    },
    {
      name: 'backend',
      script: 'npm.cmd',
      args: 'run backend',
      cwd: './',
      env: {
        NODE_ENV: 'development'
      },
      interpreter: 'none',
      watch: false,
      ignore_watch: ["public/data/**", "public/dist/**", "node_modules/**"]
    },
    {
      name: 'scheduler',
      script: './venv/Scripts/python.exe',
      args: '-m server.apis.ana.services.station_data_scheduler',
      cwd: './',
      env: {
        NODE_ENV: 'development'
      },
      watch: false,
      ignore_watch: ["public/data/**", "public/dist/**", "node_modules/**"]
    }
  ]
};


// Para iniciar o processo, execute o comando:
// pm2 start ecosystem.config.cjs