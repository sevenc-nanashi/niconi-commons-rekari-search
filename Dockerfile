FROM node:20

WORKDIR /app
ENV NODE_ENV=production
ENV API_PORT=8080

EXPOSE 8080

COPY dist/ /app/dist/

CMD ["node", "dist/index.cjs"]
