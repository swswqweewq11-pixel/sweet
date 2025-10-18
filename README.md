# roblox-headshot-proxy

Upstream: `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=<id>&size=420x420&format=Png&isCircular=false`  
This proxy returns the `imageUrl` for use in Roblox via `HttpService`.

## Endpoints

- `GET /v1/headshot?userId=<number>` → JSON `{ imageUrl, state, targetId, version, raw }`
- `GET /v1/headshot/url?userId=<number>` → `text/plain` image URL
- `GET /v1/headshot/redirect?userId=<number>` → 302 redirect to image

## Run

```bash
npm i
npm run start
# PORT optional (default 3000)
# CACHE_TTL optional (seconds, default 300)
