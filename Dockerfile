# build the react app
FROM node:18 AS node_build 
WORKDIR /var/www/app 
COPY package.json ./
RUN yarn
COPY . ./
RUN yarn build

# serve the app
FROM nginx:1.23
COPY --from=node_build /var/www/app/build /usr/share/nginx/html
COPY nginx.config /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]