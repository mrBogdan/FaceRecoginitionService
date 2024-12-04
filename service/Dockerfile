FROM node:22.12.0

WORKDIR /usr/app

COPY package*.json .

COPY src ./src

USER node

EXPOSE 8080

CMD ["node", "./src/index.js"]

