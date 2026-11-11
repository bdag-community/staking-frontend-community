# Staking frontend in Docker

Run from this repository on the Mac:

```sh
docker compose up --build -d --wait
```

Review at http://127.0.0.1:8081/. Stop an existing Vite server on that port first,
or use `STAKING_PORT=8082 docker compose up --build -d --wait` for a separate
preview. This Compose project manages only the frontend and has no data volumes.
Stop it with `docker compose stop`; view output with `docker compose logs staking`.

The multi-stage image installs the lockfile with `npm ci`, compiles Vite, and
serves only `dist` using Nginx on container port8080 as an unprivileged user.
Compose uses a read-only filesystem, a temporary Nginx directory, a loopback
host binding and a health check. React routes such as `/stake` and `/legacy`
support direct loads. Hashed assets are cached; HTML is revalidated.

## Public build configuration

The existing ignored `.env.local` supplies the same public configuration as the
local Vite preview. To select another **public-only** env file:

```sh
STAKING_PUBLIC_ENV_FILE=/absolute/path/to/public.env docker compose up --build -d --wait
```

For a fresh checkout, `.env.dev.example` documents supported values. Supply the
intended chain ID, RPC, expected genesis, API URL, public Reown project ID and
contract/credential addresses before building. The example is for the older
devnet; it is not the current private candidate4 configuration. See
`../../devnet-ops/scripts/platform/README.md` for the private review setup.

The file is mounted through a BuildKit build secret and excluded from the build
context and final image. **Its NEXT_PUBLIC_* values are still public in the
JavaScript bundle. Never pass `devnet-ops/devnet.env`, private keys or passwords.**
The container takes no runtime application secrets. Vite settings are fixed at
build time; runtime `docker run -e` overrides do not change them. BuildKit does
not invalidate its cache when secret contents change, so after changing this
file run:

```sh
docker compose build --no-cache staking
docker compose up -d --wait
```

API and RPC requests originate in the user's browser, not Nginx. Retain
browser-accessible URLs: the Mac review uses API `127.0.0.1:3101/api/v1` and RPC
`127.0.0.1:41745`. Docker service names and `host.docker.internal` are not
substitutes for browser URLs. The backend must allow the chosen frontend origin.
This frontend container does not start the backend, indexer or SSH tunnels;
the static health check does not certify their availability.

Direct Docker build/run:

```sh
docker build --secret id=frontend_env,src=.env.local -t bdag-staking:local .
docker run -d --name bdag-staking-preview --read-only --tmpfs /tmp:rw,noexec,nosuid,size=32m --cap-drop ALL --security-opt no-new-privileges:true -p 127.0.0.1:8082:8080 bdag-staking:local
```

All commands above are local. Publishing an image or changing a public deployment
requires a separate review.

## Original-devnet legacy preview (9 September 2026)

The DAO application remains at http://127.0.0.1:8081/ (home) and `/portfolio`.
The Portfolio **Legacy Staking** link opens http://127.0.0.1:8082/legacy on a separate origin. Its public configuration is `.env.legacy.local`, with `NEXT_PUBLIC_LEGACY_ONLY=true` and an explicit `NEXT_PUBLIC_CURRENT_URL=http://127.0.0.1:8081/portfolio`. Only unstake and claim are exposed; other routes redirect to `/legacy`, and the staking write guard also rejects deposits.

Both chains use ID 8008 and proxy `0x08bd519f611556dc148e7bffe8d6f078f23a8ef7`. They have separate state:

| Preview | RPC | API | Expected genesis |
| --- | --- | --- | --- |
| DAO | http://127.0.0.1:41745 | http://127.0.0.1:3101/api/v1 | `0x4468877aa84201b9c65a23a51414c90755400d62ac92b0950db7f1cb04dbe3f4` |
| Original legacy | http://127.0.0.1:42845 | http://127.0.0.1:3201/api/v1 | `0x909f5b15ebd5fbd017992da8195a2a03b913fd81290d0850b24a849751075ec8` |

The legacy tunnels forward Mac 42845 → original devnet 127.0.0.1:28545 and Mac 3201 → original API 127.0.0.1:3001. They currently belong to SSH control socket `/tmp/bdag-docker-review-ssh`. If the original tunnels are absent and their local ports are free, start them without changing remote state:

```sh
ssh -M -S /tmp/bdag-legacy-review-ssh -fnNT -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -L 127.0.0.1:42845:127.0.0.1:28545 -L 127.0.0.1:3201:127.0.0.1:3001 bdag-devnet
```

Build the two images sequentially. **Always use `--no-cache` when switching public env files or changing their contents**: BuildKit secret contents do not invalidate a cached build layer. The build rejects missing contract/RPC/genesis settings, and the running app verifies its configured RPC chain ID and genesis before mounting balances or actions.

```sh
docker compose build --no-cache staking
docker compose up -d --wait
STAKING_PUBLIC_ENV_FILE=.env.legacy.local STAKING_IMAGE=bdag-staking:legacy STAKING_PORT=8082 docker compose -p bdag-staking-legacy build --no-cache staking
STAKING_PUBLIC_ENV_FILE=.env.legacy.local STAKING_IMAGE=bdag-staking:legacy STAKING_PORT=8082 docker compose -p bdag-staking-legacy up -d --wait
```

Connect the wallet independently on each origin. Wallet network validation checks genesis as well as numeric chain ID immediately before signing. No automatic balance migration or wallet network switch occurs on page load. The original devnet uses normal 7-day epochs; the DAO rehearsal uses 60-second epochs.
