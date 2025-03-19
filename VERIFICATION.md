# Verifying Your Production Deployment

After deploying your LightRail.dev application to production, follow these steps to verify that everything is working correctly:

## 1. Check Service Status

First, verify that all services are running:

```bash
# Check the status of all services
docker-compose -f docker-compose.production.yml ps
```

All services should show a status of "Up" or "Up (healthy)". If any service shows "Exit" or "Restarting", check the logs for that specific service.

## 2. Check Logs for Errors

Examine the logs to ensure there are no errors:

```bash
# Check logs for all services
docker-compose -f docker-compose.production.yml logs -f --tail=100

# Check logs for a specific service
docker-compose -f docker-compose.production.yml logs -f app
docker-compose -f docker-compose.production.yml logs -f redis-master
docker-compose -f docker-compose.production.yml logs -f nginx
```

Look for any error messages, warnings, or connection issues that might indicate problems.

## 3. Test Redis Master-Replica Setup

Test the Redis high availability setup by simulating a master failure:

```bash
# Simulate master failure
docker-compose -f docker-compose.production.yml stop redis-master

# Check logs to see if replica takes over
docker-compose -f docker-compose.production.yml logs redis-replica

# Try to access the application to verify it still works
# (The application should continue to function using the replica)

# Restart master
docker-compose -f docker-compose.production.yml start redis-master

# Check logs to see if master reconnects
docker-compose -f docker-compose.production.yml logs redis-master
```

## 4. Verify Web Access

Access your application through a web browser:

1. Navigate to `https://yourdomain.com` in your browser
2. Verify that the site loads correctly with HTTPS (look for the lock icon)
3. Test basic functionality:
   - User authentication (login/signup)
   - Data operations (create, read, update, delete)
   - Real-time updates via WebSockets
   - AI assistant functionality (if using OpenAI integration)

## 5. Check Monitoring

Verify that your monitoring setup is working:

1. Access Grafana at `http://yourdomain.com:3001`
2. Log in and check that the Redis and Node.js dashboards are showing data
3. Verify that Prometheus is collecting metrics by checking its targets:
   - Navigate to `http://yourdomain.com:9090/targets` (if exposed)
   - All targets should show "UP" status

## 6. Test Backup Process

Manually trigger a backup to ensure the backup process works:

```bash
# Run the backup script manually
/path/to/lightrail/scripts/redis-backup.sh

# Check if the backup was created
ls -la /var/backups/redis/
```

## 7. Security Verification

Perform basic security checks:

1. Verify SSL configuration using an online tool like [SSL Labs](https://www.ssllabs.com/ssltest/)
2. Check that rate limiting is working by making multiple rapid requests to an API endpoint
3. Verify that Redis is not accessible from outside the Docker network
4. Ensure that the health check endpoint is only accessible from internal networks

If all these verification steps pass, your LightRail.dev application is successfully deployed to production!
