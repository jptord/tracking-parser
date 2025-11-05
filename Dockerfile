FROM node:18
ENV GENERATE_SOURCEMAP=false
ENV NODE_OPTIONS=--max-old-space-size=16384 

WORKDIR /usr/src/app
COPY package*.json ./
COPY . .

RUN npm install

EXPOSE 7777
EXPOSE 8989
EXPOSE 80

CMD node index.js
