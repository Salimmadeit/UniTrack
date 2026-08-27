# Deploying UniTrack

Frontend on **Netlify**, backend on **Render**.

---

## Why Render for the backend

Netlify only serves static files. It cannot run a Spring Boot process, so the
backend needs a separate host. Render is the recommendation here:

| Platform | Verdict |
|---|---|
| **Render** | **Recommended.** Free tier needs no credit card, deploys a Dockerfile straight from GitHub, redeploys on push. |
| Railway | Good, but the free tier is gone. ~$5/month of credit after the trial. |
| Fly.io | Capable, but requires a card even on the free allowance, and CLI-driven setup is more to learn. |
| Google Cloud Run | Generous free tier and genuinely scales to zero, but needs a GCP account with billing enabled and more IAM setup than this project warrants. |
| Heroku | No free tier since 2022. |

**The one catch to know up front:** on Render's free tier the service sleeps
after 15 minutes with no traffic, and the next request takes ~50 seconds to
wake it. The frontend aborts any request after 8 seconds
(`REQUEST_TIMEOUT_MS`), so the first load after an idle period shows
"Disconnected" for roughly the first minute before recovering. Mitigations are
in the troubleshooting section. Once traffic is flowing, the 6-second poll keeps
the service awake on its own.

---

## What was changed to make this deployable

These were blockers, fixed before writing this guide:

1. **`server.port` was hardcoded to 8080.** Render assigns a port at runtime and
   injects it as `$PORT`. A service that ignores it never passes the health
   check, and the deploy fails even though the app started fine. Now
   `${PORT:8080}`, so local development is unchanged.

2. **`/h2-console` was enabled.** That is an unauthenticated SQL shell, and the
   credentials are sitting in `application.properties`. On a public URL, anyone
   who found it owned the database. Now off unless `H2_CONSOLE_ENABLED=true`.

3. **No Dockerfile.** Render has no native Java runtime, so a container image is
   the only way to deploy Spring Boot there.

4. **CORS was hardcoded to `*`.** Now driven by `CORS_ALLOWED_ORIGINS`.

---

## Part 1 — Deploy the backend to Render

### 1. Push to GitHub

```bash
git add .
git commit -m "Add deployment configuration"
git push origin main
```

### 2. Create the service

1. Sign up at [render.com](https://render.com) with your GitHub account.
2. **New +** → **Web Service**.
3. Connect the `Salimmadeit/UniTrack` repository.

### 3. Configure it

| Field | Value |
|---|---|
| **Name** | `unitrack-api` (this becomes `unitrack-api.onrender.com`) |
| **Region** | Frankfurt (closest to Lagos of the free options) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Docker` |
| **Instance Type** | `Free` |

**Root Directory must be `backend`.** The Dockerfile lives there and expects to
find `pom.xml` beside it. Leave it blank and the build fails immediately.

### 4. Set environment variables

Under **Advanced** → **Add Environment Variable**:

| Key | Value |
|---|---|
| `H2_CONSOLE_ENABLED` | `false` |
| `CORS_ALLOWED_ORIGINS` | `https://YOUR-SITE.netlify.app` |

Do **not** set `PORT`. Render injects it, and overriding it will break the
health check.

You can leave `CORS_ALLOWED_ORIGINS` at its default for now and come back after
Part 2, when you know your Netlify URL. If you use the proxy in Part 2, CORS is
never exercised at all, but setting it correctly matters if anyone opens the
Render URL directly.

### 5. Deploy and verify

Click **Create Web Service**. The first build takes 5–10 minutes.

When it goes live, confirm it actually works:

```bash
curl https://unitrack-api.onrender.com/api/v1/health
# {"status":"UP"}

curl https://unitrack-api.onrender.com/api/v1/routes
# a JSON array of routes, each with a "stops" array
```

If `/routes` returns `[]`, the seeder did not run — check the Render logs.

---

## Part 2 — Deploy the frontend to Netlify

### 1. Point the proxy at your backend

Edit `netlify.toml` at the repo root and replace the hostname with your real
Render URL:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://unitrack-api.onrender.com/api/:splat"
  status = 200
  force = true
```

Commit and push.

**This redirect is the part that makes the whole thing work.** The browser calls
`/api/v1/...` on your Netlify domain; Netlify forwards it to Render server-side
and returns the response. Because the browser only ever talks to one origin:

- CORS never applies — no preflight, no allowed-origins debugging.
- No backend URL is baked into the JavaScript, so moving the backend is a
  one-line change here rather than an edit-and-redeploy of the frontend.

`status = 200` is what makes it a proxy. With `301` or `302` the browser gets
bounced to the Render origin and CORS applies again, which defeats the purpose.

### 2. Create the site

1. Sign up at [netlify.com](https://netlify.com) with GitHub.
2. **Add new site** → **Import an existing project** → pick the repository.
3. Netlify reads `netlify.toml`, so the build settings should already be filled
   in. Confirm they read:
   - **Build command:** *(empty)*
   - **Publish directory:** `frontend`
4. **Deploy site.**

### 3. Verify end to end

Open your Netlify URL and check, in order:

```bash
# The proxy is wired up correctly if this returns JSON, not HTML:
curl https://YOUR-SITE.netlify.app/api/v1/health
```

Then in the browser:
- The map renders and the shuttle route lines are drawn.
- `/driver.html` → **Start broadcasting** → allow location.
- `/index.html` on another device → the ETA panel updates within ~6 seconds.

### 4. Close the CORS loop

Back in Render, set `CORS_ALLOWED_ORIGINS` to your actual Netlify URL and let it
redeploy.

---

## Troubleshooting

### "The health route keeps failing, but /routes works"

This exact symptom came up on the live deployment, and both causes are benign.

**Cause 1 — cold start.** On the free tier the service sleeps after ~15 minutes
idle. While the container is booting, Render's edge answers with a plain-text
`404 Not Found` and an `x-render-routing: no-server` header. It looks identical
to a missing endpoint, but the request never reached Spring at all. Whichever
route you happen to try first absorbs the cold start and appears broken; by the
time you try the next one the app is up and it works. That is why `/health`
looked dead while `/routes` returned 200 seconds later.

The tell is the response body. Render's edge returns bare text:

```
Not Found
```

The application always returns JSON:

```json
{"error":"Not found","details":["No endpoint matches this path"]}
```

If you see bare text, wait and retry with a longer timeout:

```bash
curl --max-time 90 https://YOUR-SERVICE.onrender.com/api/v1/health
# {"timestamp":"...","status":"UP"}
```

**Cause 2 — the root URL has no route.** Every endpoint is versioned under
`/api/v1`, so opening the bare hostname in a browser used to 404 even on a
perfectly healthy service. `GET /` now returns a service index listing the
available endpoints, so the base URL is a useful liveness check.

### A note on `curl` in PowerShell

In PowerShell, `curl` is an alias for `Invoke-WebRequest`, not real curl. It
**throws a terminating error on any non-2xx response** instead of printing the
body, so a 404 looks like a crashed command rather than a served response. It
also does not understand curl flags like `-s` or `--max-time`.

Use `curl.exe` to get real curl:

```powershell
curl.exe -s -w "`nHTTP %{http_code}`n" --max-time 90 https://YOUR-SERVICE.onrender.com/api/v1/health
```

Also quote URLs containing `&`, or PowerShell treats it as a command separator:

```powershell
curl.exe "https://YOUR-SERVICE.onrender.com/api/v1/eta?lat=6.5167&lng=3.3850"
```

### Other issues

**Frontend loads, but every panel says "Disconnected".**
Open DevTools → Network and look at an `/api/v1/eta` call.
- Response is HTML, not JSON → the proxy rule is not matching. Check
  `netlify.toml` is at the repo **root** and that `status = 200`.
- 502 or a long hang → the Render service is asleep or crashed. Hit the Render
  health URL directly and check the logs.

**Render build fails: "no pom.xml found".**
Root Directory is not set to `backend`.

**Render deploy succeeds but the health check fails.**
Almost always a `PORT` override. Delete any `PORT` variable you set manually.

**Data disappears after a redeploy.**
Expected. The default H2 database is a file inside the container, and Render's
filesystem is ephemeral, so it is wiped on every restart and deploy. Routes and
stops are recreated by `DataSeeder` on boot; live locations and queue reports
are not. To make data survive, provision a Postgres instance, add the Postgres
driver to `pom.xml`, and set `DATABASE_URL`, `DATABASE_DRIVER`, `DATABASE_USER`,
`DATABASE_PASSWORD` and `DATABASE_DIALECT` — they are all already wired up as
environment overrides.

**First load after idle is slow.**
Free-tier cold start, as above. Three options:

1. Accept it for a demo, and wake the service a minute before you present by
   opening the backend URL in a browser tab.
2. Keep it awake with a free uptime monitor (UptimeRobot, cron-job.org) polling
   `https://YOUR-SERVICE.onrender.com/api/v1/health` every 10 minutes. Set
   Render's **Health Check Path** to `/api/v1/health` in the dashboard too, so
   Render restarts the service if it stops responding.
3. Upgrade to a paid instance, which does not sleep.

Worth knowing: the frontend aborts requests after 8 seconds
(`REQUEST_TIMEOUT_MS` in `frontend/js/config.js`), which is far shorter than a
~50s cold start. So the pages will show "Disconnected" during a wake-up even
though the backend is fine. Keeping the service warm is what fixes this for a
live demo.

---

## Before you demo this publicly

**The write endpoints have no authentication.** `POST /api/v1/location` and
`POST /api/v1/queue` are open to anyone who can reach the URL, so anyone can
broadcast a fake shuttle position or a fake crowd level. That is fine for a
class demo on a URL you control, but it needs an auth story — even a shared
secret header — before it is used for anything real.
