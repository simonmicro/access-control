FROM node:lts-alpine as builder
WORKDIR /workspace
COPY dashboard .

# Now insert the current version from the build arguments
ARG VERSION=unknown
RUN sed -i 's/release/$VERSION/g' src/environments/environment.prod.ts

RUN npm install && npm run ng build -- --output-path dist


FROM nginx:alpine
COPY .gitlab/dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# Remove default nginx index page
RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /workspace/dist /usr/share/nginx/html
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]