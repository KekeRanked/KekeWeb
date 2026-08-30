FROM php:8.4-fpm-alpine

RUN apk add --no-cache \
      icu-libs \
      libzip \
      oniguruma \
      sqlite-libs \
    && apk add --no-cache --virtual .build-deps \
      $PHPIZE_DEPS \
      icu-dev \
      libzip-dev \
      oniguruma-dev \
      sqlite-dev \
    && docker-php-ext-install -j"$(nproc)" \
      bcmath \
      intl \
      mbstring \
      pcntl \
      pdo_mysql \
      pdo_sqlite \
      zip \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

COPY backend/composer.json backend/composer.lock ./
RUN composer install \
      --no-dev \
      --no-interaction \
      --no-progress \
      --prefer-dist \
      --no-scripts

COPY backend/ ./
RUN composer dump-autoload --no-dev --classmap-authoritative --no-interaction \
    && printf '%s\n' \
      '#!/bin/sh' \
      'set -eu' \
      'mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/testing storage/framework/views storage/logs bootstrap/cache' \
      'chown -R www-data:www-data storage bootstrap/cache' \
      > /usr/local/bin/prepare-storage \
    && chmod +x /usr/local/bin/prepare-storage

COPY deploy/php-production.ini /usr/local/etc/php/conf.d/99-keke-production.ini

EXPOSE 9000

CMD ["php-fpm", "-F"]

