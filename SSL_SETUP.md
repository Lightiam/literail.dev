# Setting Up SSL with Let's Encrypt

To secure your LightRail.dev application with HTTPS, follow these steps to set up SSL certificates using Let's Encrypt:

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

## Important Notes:

1. Replace `yourdomain.com` and `www.yourdomain.com` with your actual domain names.
2. Make sure the `./client/build` directory exists before running certbot (run the client build steps first).
3. The `./letsencrypt` directory should be created as specified in the directory structure instructions.
4. After obtaining certificates, you'll need to reload Nginx to apply the SSL configuration:
   ```bash
   docker-compose -f docker-compose.production.yml exec nginx nginx -s reload
   ```
5. Let's Encrypt certificates expire after 90 days. Set up automatic renewal with a cron job:
   ```bash
   sudo crontab -e
   # Add this line to run renewal twice daily (recommended by Let's Encrypt)
   0 0,12 * * * certbot renew --quiet
   ```

These certificates will be used by the Nginx configuration to enable HTTPS for your application.
