FROM node
LABEL description="Tweets microservice"
LABEL version="1.0"
LABEL maintainer="raestor3@epsa.upv.es"
ENV PORT=8081
ENV URL_MONGODB="mongodb://127.0.0.1:27017"
ADD tweets.js model_tweets.js package.json /app/
RUN npm --prefix /app install
ENTRYPOINT node /app $PORT $URL_MONGODB