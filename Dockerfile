# Production image: build frontend + chạy bot/API bằng tsx.
FROM node:22-slim

WORKDIR /app

# openssl cần cho Prisma engine
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Cài deps (gồm devDeps: tsx, prisma, vite... cần để build & chạy)
COPY . .
RUN npm install

# Sinh Prisma client + build giao diện
RUN npm run db:generate && npm run build:web

ENV NODE_ENV=production
ENV TZ=Asia/Ho_Chi_Minh
ENV PORT=3000
EXPOSE 3000

# Áp migration rồi khởi động (bot long-polling + API + serve frontend)
CMD ["sh", "-c", "npm run db:deploy && npm start"]
