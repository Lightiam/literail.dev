# Building the Client for Production

To build the React client for production deployment, follow these steps:

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

This will create optimized production-ready files in the `client/build` directory. These files will be served by Nginx in the production environment.

The build process:
1. Bundles React in production mode
2. Minifies the code for optimal performance
3. Creates static files ready for deployment
4. Optimizes assets for faster loading

After building, the static files will be mounted to the Nginx container as specified in the `docker-compose.production.yml` file.
