# Stage 1: Build the Hugo site
FROM hugomods/hugo:exts AS builder

WORKDIR /src
COPY . .

# Build the site
RUN hugo --gc

# Stage 2: Serve the site with Nginx
FROM nginx:alpine

# Copy the built site from the builder stage
COPY --from=builder /src/public /usr/share/nginx/html

# Copy a custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
