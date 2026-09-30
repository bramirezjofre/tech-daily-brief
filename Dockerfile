# syntax=docker/dockerfile:1.7
# ==============================================================================
# Stage 1 — builder
# Builds the static site using pnpm. The runtime stage will only copy `dist/`.
# ==============================================================================
FROM node:24.12.0-alpine AS builder
WORKDIR /app

ENV CI=true \
    NODE_ENV=production \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# Enable pnpm via corepack and pin the version that matches CI.
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Copy only the manifests first to maximize Docker layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install deps exactly as in CI (frozen lockfile, offline where possible).
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm rebuild esbuild sharp

# Now copy the rest of the source needed to build the site.
COPY astro.config.ts astro-paper.config.ts tsconfig.json eslint.config.js .prettierrc .prettierignore ./
COPY src ./src
COPY public ./public

# Build the static site (this also runs Pagefind via the `build` script).
RUN pnpm run build

# Final sanity check: the artifact must exist.
RUN test -f dist/index.html

# ==============================================================================
# Stage 2 — runtime
# Minimal Nginx image that only serves /app/dist.
# ==============================================================================
FROM nginx:1.29.3-alpine AS runtime

# Drop default config and replace with our hardened one.
RUN rm -f /etc/nginx/conf.d/default.conf

# Run Nginx as the unprivileged "nginx" user on port 8080 by default.
# (You can override with NGINX_PORT and NGINX_HOST env vars.)
ENV NGINX_PORT=8080 \
    NGINX_HOST=_ \
    NGINX_WORKERS=auto

COPY docker/nginx.conf /etc/nginx/templates/default.conf.template
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy ONLY the built artifact from the builder stage.
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Final verification: nothing under src/ or any markdown leaked through.
RUN echo "Verifying artifact purity..." && \
    (find /usr/share/nginx/html -name '*.md' -print -o -name '*.mdx' -print | grep -q . && echo "ERROR: markdown leaked into image" && exit 1) || true; \
    (find /usr/share/nginx/html -path '*/src/*' -print | grep -q . && echo "ERROR: src/ leaked into image" && exit 1) || true; \
    (test -f /usr/share/nginx/html/index.html && echo "Artifact OK") || (echo "ERROR: index.html missing" && exit 1)

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

USER nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

LABEL org.opencontainers.image.title="ping-diario" \
      org.opencontainers.image.description="Static Astro blog served by Nginx" \
      org.opencontainers.image.source="https://github.com/cjcr313/tech-daily-brief"
