FROM node:20-slim

RUN apt-get update && \
apt-get install -y \
imagemagick \
potrace \
libmagickcore-6.q16-6-extra \
&& rm -rf /var/lib/apt/lists/*

RUN sed -i 's/rights="none" pattern="PNG"/rights="read|write" pattern="PNG"/' /etc/ImageMagick-6/policy.xml || true

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./

ENV PORT=10000
EXPOSE 10000

CMD ["node", "server.js"]