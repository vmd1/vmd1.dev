# Stage 1: Build the Hugo site
FROM hugomods/hugo:exts AS builder

WORKDIR /src
COPY . .

# Build the main site
RUN hugo --gc

# Stage 2: Serve the site with Nginx
FROM nginx:alpine

# 1. Dynamically copy pre-built sites (e.g. gcses.vmd1.dev, etc) directly to Nginx html/sites path
COPY --from=builder /src/sites /usr/share/nginx/html/sites

# 2. Copy the main Hugo site output from /public into its intended hostname folder (Assuming vmd1.dev is primary)
COPY --from=builder /src/public /usr/share/nginx/html/sites/vmd1.dev

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]