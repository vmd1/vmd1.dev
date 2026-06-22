# Serve the site with Nginx
FROM nginx:alpine

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all site directories (gcses.vmd1.dev, vmd1.dev, etc.) directly to Nginx html/sites path
COPY sites /usr/share/nginx/html/sites

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]