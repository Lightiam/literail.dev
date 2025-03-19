# Directory Structure for Production Deployment

Before deploying LightRail.dev to production, create the following directory structure:

```bash
mkdir -p config/redis
mkdir -p config/nginx
mkdir -p config/prometheus
mkdir -p scripts
mkdir -p letsencrypt
```

These directories are essential for storing configuration files and scripts:

- `config/redis`: Contains Redis configuration files (redis.conf)
- `config/nginx`: Contains Nginx configuration files (default.conf)
- `config/prometheus`: Contains Prometheus configuration files (prometheus.yml)
- `scripts`: Contains utility scripts like redis-backup.sh
- `letsencrypt`: Will store SSL certificates from Let's Encrypt

Make sure these directories are created before proceeding with the other deployment steps.
