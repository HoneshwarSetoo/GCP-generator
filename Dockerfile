FROM node:20-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    gettext-base \
    gdal-bin \
    libgdal-dev \
    nginx \
    python3 \
    python3-gdal \
    python3-pip \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY backend/requirements.txt backend/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r backend/requirements.txt
RUN python3 -c "from osgeo import gdal; print(gdal.VersionInfo())"

COPY . .

ARG NEXT_PUBLIC_API_BASE_URL=/api
ARG NEXT_PUBLIC_GOOGLE_MAP_API_KEY=
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_GOOGLE_MAP_API_KEY=${NEXT_PUBLIC_GOOGLE_MAP_API_KEY}

RUN npm run build

COPY deploy/nginx.conf.template /etc/nginx/nginx.conf.template
COPY deploy/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY deploy/start.sh /app/deploy/start.sh
RUN chmod +x /app/deploy/start.sh

ENV PORT=10000
EXPOSE 10000

CMD ["/app/deploy/start.sh"]
