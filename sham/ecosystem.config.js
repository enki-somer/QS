module.exports = {
  apps: [
    {
      name: "nextjs-app",
      script: "npm",
      args: "start",
      instances: "max", // Use all CPU cores
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "1G",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
    },
  ],
};
