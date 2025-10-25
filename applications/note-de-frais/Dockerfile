# Dockerfile pour Notes de Frais (statique + Nginx)
FROM nginx:alpine

# Copier les fichiers statiques
COPY . /usr/share/nginx/html

# Copier la config Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
