FROM node:lts-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY . .

RUN mkdir -p uploads

EXPOSE 5000

CMD ["pnpm", "run", "dev"]
