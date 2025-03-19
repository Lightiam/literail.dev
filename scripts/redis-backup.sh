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
