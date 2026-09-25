# build the public bridge app from the committed npm dependency graph
FROM node:22-bookworm-slim AS node_build
WORKDIR /var/www/app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --ignore-scripts
COPY . ./
RUN npm run build:public

# serve the app
FROM nginx:1.23
COPY --from=node_build /var/www/app/build/public /usr/share/nginx/html
COPY nginx.config /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
