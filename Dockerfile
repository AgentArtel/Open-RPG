FROM node:18 as build
WORKDIR /build
ADD . /build
RUN npm i
ENV NODE_ENV=production
RUN npm run build

FROM node:18-alpine
WORKDIR /game
COPY --from=build /build/dist ./dist
COPY --from=build /build/package*.json ./
ENV NODE_ENV=production
RUN npm i

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD ["/bin/sh", "-c", "wget --no-verbose --tries=1 --spider \"http://localhost:${PORT:-3000}/health\" || exit 1"]

CMD npm start