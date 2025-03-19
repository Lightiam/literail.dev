# Setting Up Cron Jobs for Redis Backups

To ensure your Redis data is regularly backed up, follow these steps to set up a cron job for automated backups:

## Setting Up the Backup Cron Job

```bash
# Edit the crontab for the current user
crontab -e

# Add this line to run the backup daily at 2 AM
0 2 * * * /path/to/lightrail/scripts/redis-backup.sh >> /var/log/redis-backup.log 2>&1
```

## Understanding the Cron Job

The cron job is configured to:
- Run every day at 2:00 AM (`0 2 * * *`)
- Execute the Redis backup script (`/path/to/lightrail/scripts/redis-backup.sh`)
- Redirect both standard output and errors to a log file (`>> /var/log/redis-backup.log 2>&1`)

## Important Notes:

1. Replace `/path/to/lightrail` with the actual absolute path to your LightRail.dev installation.
2. Make sure the backup script is executable:
   ```bash
   chmod +x /path/to/lightrail/scripts/redis-backup.sh
   ```
3. Ensure the log directory exists and is writable:
   ```bash
   sudo mkdir -p /var/log
   sudo touch /var/log/redis-backup.log
   sudo chmod 644 /var/log/redis-backup.log
   ```
4. Verify the cron job is set up correctly:
   ```bash
   crontab -l
   ```

## Testing the Backup Script

Before relying on the cron job, test the backup script manually:

```bash
# Run the script manually
/path/to/lightrail/scripts/redis-backup.sh

# Check if the backup was created
ls -la /var/backups/redis/
```

## Monitoring Backup Execution

To monitor if your backups are running correctly:

```bash
# Check the log file
tail -f /var/log/redis-backup.log

# Check the backup directory
ls -la /var/backups/redis/
```

Remember that the backup script is configured to keep only the last 7 days of backups to prevent disk space issues.
