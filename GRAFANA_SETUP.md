# Setting Up Grafana Dashboards

After deploying your LightRail.dev application, follow these steps to set up monitoring with Grafana:

## Accessing Grafana

1. Open your browser and navigate to http://yourdomain.com:3001
2. Log in with the default credentials:
   - Username: `admin`
   - Password: `admin`
3. You'll be prompted to change the password on first login. Create a strong password.

## Adding Prometheus as a Data Source

1. In the Grafana sidebar, click on "Configuration" (gear icon)
2. Select "Data sources"
3. Click "Add data source"
4. Select "Prometheus" from the list
5. Configure the data source:
   - Name: `Prometheus`
   - URL: `http://prometheus:9090`
   - Access: `Server (default)`
6. Click "Save & Test" to verify the connection

## Importing Redis Dashboard

1. In the Grafana sidebar, click on the "+" icon
2. Select "Import"
3. Enter dashboard ID: `763`
4. Click "Load"
5. Select the Prometheus data source you created
6. Click "Import"

This dashboard provides comprehensive monitoring for your Redis instances, including:
- Memory usage
- Connected clients
- Commands processed per second
- Hit/miss ratios
- Network traffic

## Importing Node.js Dashboard

1. In the Grafana sidebar, click on the "+" icon
2. Select "Import"
3. Enter dashboard ID: `11159`
4. Click "Load"
5. Select the Prometheus data source you created
6. Click "Import"

This dashboard provides monitoring for your Node.js application, including:
- CPU and memory usage
- Event loop lag
- HTTP request rates and durations
- Garbage collection metrics

## Customizing Dashboards

You can customize these dashboards by:
- Adding new panels
- Modifying existing panels
- Creating alert rules for critical metrics
- Adjusting time ranges

## Setting Up Alerts

1. For critical metrics, hover over a panel and click the edit icon
2. Go to the "Alert" tab
3. Configure alert conditions and notification channels
4. Save the alert

Remember to check these dashboards regularly to monitor the health and performance of your LightRail.dev application.
