FROM node:20-alpine

WORKDIR /app

# Keep docker builds fast by leveraging layer caching on dependency install.
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/db/package.json ./packages/db/package.json

RUN npm install

EXPOSE 4000

CMD ["npm", "--workspace", "@ac/api", "run", "dev"]
