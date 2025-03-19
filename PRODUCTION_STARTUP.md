# Starting the Production Environment

To start the LightRail.dev application in production mode, follow these steps:

```bash
# Make sure you have Docker and Docker Compose installed

# Start everything using the production configuration
docker-compose -f docker-compose.production.yml up -d

# Check if all services are running
docker-compose -f docker-compose.production.yml ps
```

## What This Does:

1. The `-f docker-compose.production.yml` flag specifies that we're using the production-specific Docker Compose configuration.
2. The `-d` flag runs the containers in detached mode (in the background).

## Verifying Deployment:

After starting the services, you should verify that everything is running correctly:

```bash
# Check the status of all services
docker-compose -f docker-compose.production.yml ps

# Check logs for any errors
docker-compose -f docker-compose.production.yml logs -f --tail=100

# Check logs for a specific service
docker-compose -f docker-compose.production.yml logs -f app
```

## Stopping the Environment:

If you need to stop the environment:

```bash
# Stop all services
docker-compose -f docker-compose.production.yml down

# Stop all services and remove volumes (caution: this will delete all data)
docker-compose -f docker-compose.production.yml down -v
```

Make sure all the previous setup steps (environment file, directory structure, client build, SSL setup) have been completed before starting the production environment.
