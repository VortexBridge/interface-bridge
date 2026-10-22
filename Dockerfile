# build the react app the way it is tested: the same node, the committed lockfile (npm ci), no install scripts
FROM node:22.12.0-bookworm@sha256:0e910f435308c36ea60b4cfd7b80208044d77a074d16b768a81901ce938a62dc AS node_build
WORKDIR /var/www/app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --ignore-scripts --no-audit --no-fund
COPY . ./
RUN npm run build

# serve the app
FROM nginx:1.23@sha256:f5747a42e3adcb3168049d63278d7251d91185bb5111d2563d58729a5c9179b0
COPY --from=node_build /var/www/app/build /usr/share/nginx/html
COPY nginx.config /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]