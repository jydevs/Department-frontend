# syntax=docker/dockerfile:1
# Imagen de producción (Next.js `output: "standalone"`). Ver docs/ENTORNOS.md.
#
#   docker build \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.tu-dominio.com \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://tu-dominio.com \
#     --build-arg NEXT_PUBLIC_WOMPI_PUBLIC_KEY=pub_prod_xxx \
#     -t department-frontend .
#   docker run -p 3000:3000 -e STOREFRONT_REVALIDATE_SECRET=... -e STOREFRONT_SERVER_KEY=... [-e API_URL=http://backend:4000] department-frontend
#
# Las NEXT_PUBLIC_* se incrustan en el build (no son secretos). Los secretos se pasan SOLO al ejecutar (-e), nunca como ARG.
# El build necesita la API accesible (prerenderiza la home/colecciones) o que el contenido caiga a sus valores por defecto.

FROM node:26-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:26-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_APP_ENV=production
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_WOMPI_PUBLIC_KEY=
ARG NEXT_PUBLIC_INDEXABLE=true
# API interna para el prerender durante el build (opcional)
ARG API_URL
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_WOMPI_PUBLIC_KEY=$NEXT_PUBLIC_WOMPI_PUBLIC_KEY \
    NEXT_PUBLIC_INDEXABLE=$NEXT_PUBLIC_INDEXABLE \
    API_URL=$API_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN yarn build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Las NEXT_PUBLIC_* ya van incrustadas en el build. En runtime solo hacen falta las variables de servidor:
# API_URL (si difiere de la pública), STOREFRONT_REVALIDATE_SECRET, STOREFRONT_SERVER_KEY, REDIRECT_ALLOWED_HOSTS.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
