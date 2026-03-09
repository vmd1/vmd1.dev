# Stage 1: Build the Hugo site
FROM --platform=$BUILDPLATFORM klakegg/hugo:ext-alpine AS builder

WORKDIR /src
COPY . .

# Build the site
RUN hugo --gc

# Stage 2: Serve the site with Nginx
FROM nginx:alpine

# Copy the built site from the builder stage
COPY --from=builder /src/public /usr/share/nginx/html

# Copy a custom Nginx configuration if needed, or use default
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
