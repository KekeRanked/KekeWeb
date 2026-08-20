# KEKE API

Backend Laravel separado para el sitio de KEKE Ranked Network. El frontend React continúa en la carpeta padre y consume esta aplicación mediante JSON.

## Requisitos locales

- PHP 8.3 o superior.
- Composer 2.
- MySQL para producción y para las bases existentes del plugin.
- SQLite puede usarse para desarrollar las funciones propias del sitio.

En este equipo PHP 8.3 está en:

```powershell
C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe
```

## Primer arranque

```powershell
cd C:\Users\User\Desktop\KekeWeb\backend
Copy-Item .env.example .env
& 'C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe' artisan key:generate
New-Item -ItemType File -Force database\database.sqlite
& 'C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe' artisan migrate --seed
& 'C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe' artisan serve
```

La API quedará en `http://localhost:8000` y el frontend continúa en `http://localhost:3000`.

## Variables privadas

Completa en `.env`, nunca en Git:

- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` y `DISCORD_REDIRECT_URI`.
- `MINECRAFT_STATS_DB_*` para `ranked_players` y `ranked_player_ratings`.
- `MINECRAFT_MATCHES_DB_*` para `matches`, `match_players` y `match_events`.
- `MATCH_SERVER_1_TOKEN`, `MATCH_SERVER_2_TOKEN` y `MATCH_SERVER_3_TOKEN`.

Las cuentas MySQL usadas por `MINECRAFT_*` deben tener permiso de solo lectura. El navegador nunca debe conectarse directamente a MySQL.

## Discord

En Discord Developer Portal registra esta URL de redirección local:

```text
http://localhost:8000/api/auth/discord/callback
```

Después del primer inicio de sesión del dueño, asígnale el rol inicial:

```powershell
& 'C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe' artisan staff:grant ID_DE_DISCORD owner
```

## Estado de los tres servidores

Cada servidor envía un `PUT` periódico a uno de estos endpoints:

```text
/api/internal/servers/ranked-1/snapshot
/api/internal/servers/ranked-2/snapshot
/api/internal/servers/ranked-3/snapshot
```

Debe incluir `Authorization: Bearer TOKEN_DEL_SERVIDOR` o `X-Server-Token`. El cuerpo admite el estado, la partida activa, jugadores y observadores. La web considera offline un servidor que no reporta durante 90 segundos.

## API pública inicial

- `GET /api/news`
- `GET /api/rules?scope=minecraft|discord`
- `GET /api/events`
- `GET /api/store/products`
- `GET /api/ranked/leaderboards`
- `GET /api/ranked/players/{uuid}`
- `GET /api/ranked/players/{uuid}/matches`
- `GET /api/ranked/servers`
- `GET /api/ranked/matches`
- `GET /api/ranked/matches/{matchId}`

## Pruebas

```powershell
& 'C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe' artisan test
```
