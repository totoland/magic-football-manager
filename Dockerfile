# Static PWA served by nginx. Built for linux/arm64 (Pi 5) and imported
# straight into k3s containerd via deploy/deploy.sh (no registry needed).
FROM nginx:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

# Only the runtime assets — not tests/, build/, vendor/ or the standalone build.
COPY index.html styles.css manifest.webmanifest icon.svg sw.js /usr/share/nginx/html/
COPY js/    /usr/share/nginx/html/js/
COPY icons/ /usr/share/nginx/html/icons/

EXPOSE 80
