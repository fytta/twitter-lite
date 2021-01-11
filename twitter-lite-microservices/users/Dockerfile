FROM node
LABEL description="Users microservice"
LABEL version="1.0"
LABEL maintainer="raestor3@epsa.upv.es"
ENV PORT=8080
ENV URL_MONGODB="mongodb://127.0.0.1:27017"
ADD users.js model_users.js package.json /app/
RUN npm --prefix /app install
ENTRYPOINT node /app $PORT $URL_MONGODB
