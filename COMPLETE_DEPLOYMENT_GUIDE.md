# LightRail.dev Production Deployment Guide

This guide combines the existing LightRail.dev setup script with detailed production deployment steps. Follow these steps in order to set up a production-ready LightRail.dev instance with Redis.

## Table of Contents

1. [Initial Setup (Using Existing Script)](#1-initial-setup-using-existing-script)
2. [Production Environment File](#2-production-environment-file)
3. [Enhanced Security Middleware](#3-enhanced-security-middleware)
4. [Redis Production Configuration](#4-redis-production-configuration)
5. [Production Docker Compose Configuration](#5-production-docker-compose-configuration)
6. [Nginx Configuration for Production](#6-nginx-configuration-for-production)
7. [Prometheus Configuration](#7-prometheus-configuration)
8. [Redis Backup Script](#8-redis-backup-script)
9. [Directory Structure for Production](#9-directory-structure-for-production)
10. [Building the Client for Production](#10-building-the-client-for-production)
11. [Setting Up SSL with Let's Encrypt](#11-setting-up-ssl-with-lets-encrypt)
12. [Starting the Production Environment](#12-starting-the-production-environment)
13. [Setting Up Grafana Dashboards](#13-setting-up-grafana-dashboards)
14. [Setting Up Cron Jobs for Backups](#14-setting-up-cron-jobs-for-backups)
15. [Verifying Your Production Deployment](#15-verifying-your-production-deployment)
16. [Production Maintenance](#16-production-maintenance)

## 1. Initial Setup (Using Existing Script)

Start by setting up the basic LightRail.dev project using the provided setup script:

```bash
# Make the script executable
chmod +x setup-lightrail-redis.sh

# Run the script to create the base project
./setup-lightrail-redis.sh

# Enter the project directory
cd lightrail
```

This script creates a basic LightRail.dev project with Redis integration, including:
- Server with Express.js
- React client
- Redis integration using ioredis
- Basic authentication with JWT
- Security rules for data access
- AI service integration with OpenAI

## 2. Production Environment File

Create a production-specific environment file:

```bash
# Create a production .env file
cp .env .env.production

# Edit the production environment variables
nano .env.production
```

Add these production-specific settings to your `.env.production` file:

```
# Production environment
NODE_ENV=production
PORT=3000

# Redis Configuration with password (change this)
REDIS_URL=redis://redis-master:6379
REDIS_PASSWORD=your-strong-production-password
REDIS_PREFIX=lightrail:

# Authentication with strong secrets
JWT_SECRET=generate-a-long-random-string-here
JWT_REFRESH_SECRET=generate-another-long-random-string-here
JWT_ACCESS_EXPIRATION=30m
JWT_REFRESH_EXPIRATION=7d

# CORS settings
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
AI_RATE_LIMIT_WINDOW_MS=3600000
AI_RATE_LIMIT_MAX=50

# OpenAI API Key for production
OPENAI_API_KEY=your-production-openai-api-key
AI_MODEL=gpt-4-turbo-preview

# Monitoring (optional but recommended)
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
ELASTICSEARCH_URL=http://elasticsearch:9200
```

## 3. Enhanced Security Middleware

Create a new security middleware file to enhance the application's security:

```bash
# Create the middleware directory if it doesn't exist
mkdir -p server/middleware

# Create the security middleware file
nano server/middleware/security.js
```

Add this content to the security.js file:

```javascript
// server/middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const xss = require('xss-clean');
const hpp = require('hpp');

const setupSecurity = (app) => {
  // Set security HTTP headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'", process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*'],
      }
    }
  }));
  
  // Enable CORS with restrictive options
  app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 3600
  }));
  
  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes by default
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requests per window by default
    standardHeaders: true,
    message: 'Too many requests from this IP, please try again later'
  });
  app.use('/api/', limiter);
  
  // AI service specific stronger rate limit
  const aiLimiter = rateLimit({
    windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS) || 60 * 60 * 1000, // 1 hour by default
    max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 50, // 50 requests per window by default
    message: 'Too many AI requests, please try again later'
  });
  app.use('/api/ai/', aiLimiter);
  
  // Data sanitization against XSS
  app.use(xss());
  
  // Prevent parameter pollution
  app.use(hpp({
    whitelist: [
      'orderBy', 'limit', 'startAt', 'endAt'
    ]
  }));
};

module.exports = setupSecurity;
```

Now update your server index file to use the new security middleware:

```bash
# Edit the server index file
nano server/index.js
```

Add this near the top with the other imports:

```javascript
const setupSecurity = require('./middleware/security');
```

Replace the basic security middleware with our enhanced version:

```javascript
// Find these lines
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Replace with this single line
setupSecurity(app);
app.use(compression());
```

## 4. Redis Production Configuration

Create a Redis configuration file for production:

```bash
# Create the Redis config directory
mkdir -p config/redis

# Create the Redis configuration file
nano config/redis/redis.conf
```

Add this content to the Redis configuration file:

```
# Redis production configuration
protected-mode yes
port 6379
bind 127.0.0.1 # Change to your server's private IP in production

# Authentication (set a strong password)
requirepass your-strong-production-password

# Network security
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Memory management
maxclients 10000
maxmemory 2gb
maxmemory-policy volatile-lru

# Disable potentially dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""
rename-command CONFIG ""
rename-command SHUTDOWN ""

# Persistence settings
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis
```

## 5. Production Docker Compose Configuration

Create a production-specific Docker Compose file:

```bash
# Create the production Docker Compose file
nano docker-compose.production.yml
```

Add this content to the Docker Compose file:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file: .env.production
    depends_on:
      - redis-master
      - redis-replica
    restart: unless-stopped
    volumes:
      - ./config:/app/config
      - ./uploads:/app/uploads
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis-master:
    image: redis:6-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-master-data:/data
      - ./config/redis/redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis-replica:
    image: redis:6-alpine
    depends_on:
      - redis-master
    volumes:
      - redis-replica-data:/data
    command: redis-server --slaveof redis-master 6379 --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx:/etc/nginx/conf.d
      - ./client/build:/usr/share/nginx/html
      - ./letsencrypt:/etc/letsencrypt
    depends_on:
      - app
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./config/prometheus:/etc/prometheus
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    restart: unless-stopped
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana-data:/var/lib/grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false

volumes:
  redis-master-data:
  redis-replica-data:
  prometheus-data:
  grafana-data:
```

## 6. Nginx Configuration for Production

Create an Nginx configuration file for SSL and reverse proxy:

```bash
# Create the Nginx config directory
mkdir -p config/nginx

# Create the Nginx configuration file
nano config/nginx/default.conf
```

Add this content to the Nginx configuration file:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
    
    # Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /usr/share/nginx/html;
    }
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Referrer-Policy no-referrer-when-downgrade;
    
    # API proxy
    location /api/ {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
        client_max_body_size 10M;
    }
    
    # WebSocket proxy
    location /socket.io/ {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Health check
    location /health {
        proxy_pass http://app:3000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Restrict access to internal networks
        allow 127.0.0.1;
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
    }
    
    # Static files
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        expires 7d;
    }
}
```

## 7. Prometheus Configuration

Create a Prometheus configuration file for monitoring:

```bash
# Create the Prometheus config directory
mkdir -p config/prometheus

# Create the Prometheus configuration file
nano config/prometheus/prometheus.yml
```

Add this content to the Prometheus configuration file:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'lightrail'
    scrape_interval: 5s
    static_configs:
      - targets: ['app:3000']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-master:6379']
      - targets: ['redis-replica:6379']
```

## 8. Redis Backup Script

Create a backup script for Redis:

```bash
# Create the scripts directory
mkdir -p scripts

# Create the Redis backup script
nano scripts/redis-backup.sh
```

Add this content to the Redis backup script:

```bash
#!/bin/bash
# redis-backup.sh

TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="/var/backups/redis"
REDIS_PASSWORD="your-redis-password"  # Use same password as in redis.conf
BACKUP_RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create Redis backup
docker exec lightrail_redis-master_1 redis-cli -a $REDIS_PASSWORD --rdb /data/redis-dump-$TIMESTAMP.rdb

# Copy from container to host
docker cp lightrail_redis-master_1:/data/redis-dump-$TIMESTAMP.rdb $BACKUP_DIR/

# Compress the backup
gzip $BACKUP_DIR/redis-dump-$TIMESTAMP.rdb

# Keep only the last 7 days of backups
find $BACKUP_DIR -name "redis-dump-*.rdb.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete

echo "Redis backup completed: $BACKUP_DIR/redis-dump-$TIMESTAMP.rdb.gz"
```

Make the script executable:

```bash
chmod +x scripts/redis-backup.sh
```

## 9. Directory Structure for Production

Create the necessary directories for production:

```bash
mkdir -p config/redis
mkdir -p config/nginx
mkdir -p config/prometheus
mkdir -p scripts
mkdir -p letsencrypt
```

## 10. Building the Client for Production

Build the React client for production:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Build for production
npm run build

# Go back to main directory
cd ..
```

## 11. Setting Up SSL with Let's Encrypt

Install certbot and obtain SSL certificates:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Get certificates
sudo certbot certonly --webroot -w ./client/build -d yourdomain.com -d www.yourdomain.com

# Copy certificates to the correct location
sudo cp /etc/letsencrypt/live/yourdomain.com/* ./letsencrypt/

# Set correct permissions
sudo chown -R $(whoami) ./letsencrypt
chmod -R 755 ./letsencrypt
```

## 12. Starting the Production Environment

Start the production environment using Docker Compose:

```bash
# Start everything using the production configuration
docker-compose -f docker-compose.production.yml up -d

# Check if all services are running
docker-compose -f docker-compose.production.yml ps
```

## 13. Setting Up Grafana Dashboards

Once your services are running, set up Grafana:

1. Open http://yourdomain.com:3001
2. Log in with admin/admin (you'll be prompted to change the password)
3. Add Prometheus as a data source:
   - URL: http://prometheus:9090
4. Import a Redis dashboard (ID: 763)
5. Import a Node.js dashboard (ID: 11159)

## 14. Setting Up Cron Jobs for Backups

Add a cron job for daily Redis backups:

```bash
# Edit crontab
crontab -e

# Add this line to run the backup daily at 2 AM
0 2 * * * /path/to/lightrail/scripts/redis-backup.sh >> /var/log/redis-backup.log 2>&1
```

## 15. Verifying Your Production Deployment

After deploying, verify that everything is working correctly:

```bash
# Check if all services are running
docker-compose -f docker-compose.production.yml ps

# Check logs for any errors
docker-compose -f docker-compose.production.yml logs -f --tail=100

# Test Redis master-replica setup
# Simulate master failure
docker-compose -f docker-compose.production.yml stop redis-master

# Check logs to see if replica takes over
docker-compose -f docker-compose.production.yml logs redis-replica

# Restart master
docker-compose -f docker-compose.production.yml start redis-master
```

Access the application at https://yourdomain.com to verify it's working correctly.

## 16. Production Maintenance

### Monitoring Your Application

```bash
# Check logs
docker-compose -f docker-compose.production.yml logs -f --tail=100

# Check specific service logs
docker-compose -f docker-compose.production.yml logs -f app

# Monitor resource usage
docker stats
```

### Updating the Application

```bash
# Pull latest code
git pull

# Rebuild client
cd client && npm install && npm run build && cd ..

# Rebuild and restart containers
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d
```

## Key Enhancements in This Production Setup

1. **Enhanced Security**:
   - Improved security middleware with CSP, XSS protection, and parameter pollution prevention
   - Rate limiting for API and AI endpoints
   - Secure Redis configuration with password protection and disabled dangerous commands
   - HTTPS with SSL/TLS using Let's Encrypt

2. **High Availability**:
   - Redis master-replica setup for redundancy
   - Container health checks and automatic restarts
   - Resource limits to prevent container resource exhaustion

3. **Monitoring and Observability**:
   - Prometheus for metrics collection
   - Grafana for visualization and dashboards
   - Health check endpoints for service monitoring

4. **Backup and Recovery**:
   - Automated Redis backup script
   - Backup retention policy
   - Cron job for scheduled backups

5. **Performance Optimization**:
   - Nginx as a reverse proxy with caching for static assets
   - Redis memory management settings
   - Compression for API responses

## Important Production Recommendations

When deploying to production, make sure to:
- Replace placeholder values (like "yourdomain.com" and passwords) with your actual values
- Generate strong, unique passwords and secrets for JWT and Redis
- Secure your server with proper firewall rules
- Regularly update dependencies and apply security patches
- Monitor system resources and scale as needed

This guide provides a comprehensive approach to deploying LightRail.dev with Redis in a production environment, ensuring security, reliability, and performance.
