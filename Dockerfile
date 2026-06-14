# Self-contained static PWA on nginx — zero CDN at runtime.
# The dist/ tree is produced by `node build/build-dist.mjs` (JSX precompiled,
# React + fonts vendored locally). deploy/deploy.sh runs that build first.
FROM nginx:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/

EXPOSE 80
