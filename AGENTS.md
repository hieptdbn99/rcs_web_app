<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:rcs-project-memory -->
# Project Memory: RCS Robot Workflow

Last analyzed: 2026-04-29.

This repository is `rcs_web_app`, a Next.js 16 App Router web app for factory operators and technicians to operate an RCS-2000 robot control system from desktop or mobile browser. The main use cases are scanning QR codes, sending robot tasks, binding or unbinding carriers/racks to sites, querying task/robot/carrier status, and exposing callback endpoints for RCS to call back into the web app.

## Runtime And Framework Notes

- This app uses `next@16.2.4`, `react@19.2.4`, TypeScript, Tailwind CSS v4, `@zxing/browser` for QR scanning, `lucide-react` icons, `react-hot-toast`, and `uuid`.
- Next.js 16 is not compatible with older assumptions. Before editing Next-specific code, read the relevant local docs under `node_modules/next/dist/docs/`.
- Important Next 16 notes already checked:
  - Route Handler `params` are async and must be awaited. Existing dynamic routes follow this pattern.
  - `next lint` is removed. The project correctly uses the ESLint CLI via `npm run lint`.
  - `next dev` and `next build` use separate output dirs. Dev output is under `.next/dev`.
  - `output: "standalone"` creates `.next/standalone`, but `public` and `.next/static` must be copied manually for deployment.
- `next.config.ts` uses `output: "standalone"` and `allowedDevOrigins`. It enumerates local IPv4 addresses and prints LAN HTTPS URLs, currently during both dev and build config loading.

## Main Architecture

- Main UI entry: `src/app/page.tsx`.
- Root layout and mobile viewport: `src/app/layout.tsx`.
- Global Tailwind styles and component classes: `src/app/globals.css`.
- RCS API catalog: `src/lib/rcsApiCatalog.ts`.
- Form schemas and tab icons: `src/lib/rcsFormSchemas.tsx`.
- Payload, QR, and RCS response helpers: `src/lib/rcsPayloadBuilder.ts`.
- Server-side RCS HTTP client and optional signing: `src/lib/rcsClient.ts`.
- Shared types: `src/lib/rcsTypes.ts`.
- Generic outbound dispatcher: `src/app/api/rcs/actions/[apiId]/route.ts`.
- Inbound callback handler: `src/app/api/robot/reporter/[...slug]/route.ts`.
- Older convenience routes still exist: `src/app/api/robot/route.ts`, `src/app/api/carrier/bind/route.ts`, `src/app/api/rcs/task/query/route.ts`. The current UI mainly uses the generic dispatcher.

## User Interface Flow

The app is a client-side operator panel with tabs:

- `Nhanh`: quick operator workflow.
- `Task workflow`: task group, submit, continue, cancel, priority, pretask, custom API.
- `Kệ, carrier, point`: bind/unbind carrier/site and lock/unlock carrier/site.
- `Khu vực`: pause/restore, homing, banish/clear area, blockade/open area.
- `Trạng thái`: query task, robot, and carrier.
- `Tích hợp và callback`: outbound equipment notification and inbound callback documentation.

The top-level state lives in `src/app/page.tsx`. QR scanning opens `QrScannerModal`, reads with `BrowserMultiFormatReader.decodeFromVideoDevice`, normalizes the scanned value, then writes it into either quick-flow state or an API form field.

`normalizeQrValue` supports:

- Plain text, for example `RACK_01`.
- JSON fields such as `carrierCode`, `siteCode`, `robotTaskCode`, `singleRobotCode`, `zoneCode`, `code`, `id`, `value`, `text`.
- URL query params with the same common field names.

## Quick Robot Workflows

### Carrier To Site

Located in `QuickMovePanel` and executed by `executeMoveTask` in `src/app/page.tsx`.

Input:

- Carrier/rack code.
- Destination site code.
- Task type, default `PF-LMR-COMMON`.
- Priority, default `10`.

Payload shape:

```json
{
  "taskType": "PF-LMR-COMMON",
  "targetRoute": [
    { "seq": 0, "type": "CARRIER", "code": "RACK_01" },
    { "seq": 1, "type": "SITE", "code": "STATION_A", "operation": "DELIVERY" }
  ],
  "initPriority": 10,
  "interrupt": 0,
  "extra": null
}
```

It calls `POST /api/rcs/actions/task-submit`, which maps to RCS endpoint `/api/robot/controller/task/submit`.

### Site To Site

Also executed by `executeMoveTask`.

Input:

- Source site code.
- Destination site code.
- Task type, default `PF-DETECT-CARRIER`.
- Carrier type, default `66`.

Payload shape:

```json
{
  "taskType": "PF-DETECT-CARRIER",
  "targetRoute": [
    { "seq": 0, "type": "SITE", "code": "SITE_A", "operation": "COLLECT" },
    { "seq": 1, "type": "SITE", "code": "SITE_B", "operation": "DELIVERY" }
  ],
  "initPriority": 10,
  "interrupt": 0,
  "extra": { "carrierInfo": [{ "carrierType": "66" }] }
}
```

### Bind Or Unbind Carrier To Site

Located in `QuickBindPanel` and executed by `executeBind`.

Input:

- Carrier/rack code.
- Current site code.
- Direction angle for bind.
- Carrier type for bind.
- Invoke: `BIND` or `UNBIND`.

It calls `POST /api/rcs/actions/site-bind`, mapped to `/api/robot/controller/site/bind`.

### Query Task Status

Located in `QuickStatusPanel` and executed by `queryTaskStatus`.

Input:

- `robotTaskCode`.

It calls `POST /api/rcs/actions/task-query`, mapped to `/api/robot/controller/task/query`.

## API Console Workflow

The API Console is catalog-driven.

1. API definitions live in `RCS_API_CATALOG`.
2. UI form fields live in `API_FORM_SCHEMAS`.
3. `buildPayloadFromForm` translates form values into the RCS payload.
4. `ApiConsole` shows the form, preview payload JSON, and an advanced JSON editor.
5. Outbound APIs call `executeCatalogApi`, then `callRcsAction`, then `/api/rcs/actions/[apiId]`.
6. Callback APIs are displayed as inbound endpoints and cannot be called through the outbound dispatcher.

To add a new outbound RCS API:

1. Add an entry in `src/lib/rcsApiCatalog.ts` with a stable `id`, group, risk, endpoint, and default payload.
2. Add a form schema in `src/lib/rcsFormSchemas.tsx` if non-technical users should use it.
3. Add a `case` in `buildPayloadFromForm` if the payload is not a direct flat object.
4. Test through the API Console and check `ResultPanel`.

To add a new inbound callback:

1. Add a catalog entry with `direction: "callback"` and `localCallbackPath`.
2. Ensure the path is under `/api/robot/reporter/...` if using the existing catch-all route.
3. Add real business logic in `src/app/api/robot/reporter/[...slug]/route.ts` if RCS needs more than the default `SUCCESS` response.

## Server-Side RCS Call Flow

`callRcsPath(path, payload)` in `src/lib/rcsClient.ts` is the single outbound HTTP client.

Environment:

- `RCS_HOST` is required and should include `http://` or `https://`.
- `APP_KEY` and `APP_SECRET` are optional. If both exist, requests are signed.
- `RCS_REQUEST_TIMEOUT_MS` controls outbound RCS timeout. Default is `15000`.
- `RCS_ALLOW_INSECURE_TLS=true` allows self-signed RCS HTTPS certificates for this RCS client only.
- `RCS_OPERATOR_TOKEN` protects outbound robot-control routes when set. Users enter it with the `Token API` button in the UI.
- `RCS_ALLOWED_CLIENT_IPS` optionally restricts outbound route callers by comma-separated client IP.
- `RCS_CALLBACK_TOKEN` protects inbound callbacks when set.

URL construction:

```text
{RCS_HOST}/rcs/rtas{catalogEndpoint}
```

Example:

```text
RCS_HOST=https://RCS_IP
catalog endpoint=/api/robot/controller/task/submit
final URL=https://RCS_IP/rcs/rtas/api/robot/controller/task/submit
```

Signing behavior:

- Uses HMAC-SHA256 over the constructed canonical request string.
- Then MD5s the HMAC hex and takes substring positions 8 to 24 as `sign`.
- Appends `?sign=...` to the RCS URL.
- Adds `Authorization`, `X-lr-appkey`, `X-lr-request-id`, `X-lr-source`, and `X-lr-version` headers.

Current important behavior:

- TLS verification is on by default. Self-signed RCS HTTPS requires `RCS_ALLOW_INSECURE_TLS=true`.
- RCS calls use Node `http`/`https` with a request timeout from `RCS_REQUEST_TIMEOUT_MS`.
- Signing nonce uses `crypto.randomBytes`.
- Returned `request.url` redacts the `sign` query value before it reaches the browser UI.

## Callback Behavior

`src/app/api/robot/reporter/[...slug]/route.ts` accepts all POST callbacks under `/api/robot/reporter/...`.

Current behavior:

- Builds `callbackPath` from the slug.
- Looks up the catalog callback entry.
- Parses JSON payload if possible.
- Logs callback path, API id, timestamp, and payload to server console.
- Always returns:

```json
{
  "code": "SUCCESS",
  "message": "Succeeded",
  "data": {
    "callbackPath": "...",
    "apiId": "...",
    "receivedAt": "...",
    "extra": null
  }
}
```

This is only a stub for integration. If RCS requires WMS decisions, resource allocation, traffic control, or equipment commands, implement real logic here.

## Deployment And USB Build

`package.json` scripts:

- `npm run dev`: HTTP dev server.
- `npm run dev:https`: Next dev HTTPS on `0.0.0.0`, useful for phone camera QR scanning.
- `npm run lint`: ESLint CLI.
- `npm run build`: runs `next build`, then `postbuild`.
- `postbuild`: runs `python build_usb.py`.

`build_usb.py` behavior:

- Deletes and recreates `USB_Deploy`.
- Copies `.next/standalone` into `USB_Deploy`.
- Copies `public` and `.next/static`, required for standalone deployment.
- Copies `.env.local` only when `USB_COPY_ENV=true`; otherwise copies `.env.example`.
- Copies `certificates/` when `localhost-key.pem` and `localhost.pem` exist.
- Downloads Windows x64 `node.exe` version `20.11.1` from nodejs.org.
- Creates `start.bat`, sets `HOSTNAME=0.0.0.0` and `PORT=3000`, then runs `node.exe server.js`.
- Creates `https-proxy.js`. If certificates exist, `start.bat` starts an HTTPS proxy on port `3443` for phone QR scanning.

Do not run `npm run build` casually if you do not want `USB_Deploy` regenerated and `node.exe` downloaded. Use `npx next build` for a pure Next build check.

## Verification Snapshot

These checks were run successfully on 2026-04-29 after the hardening changes:

```powershell
npm run lint
npx tsc --noEmit --incremental false
npx next build
```

Results:

- Lint passed.
- TypeScript passed.
- Next production build passed with Next.js 16.2.4 and Turbopack.

There is currently no real automated test suite. `package.json` has no `test` script. `TEST.md` is only a payload fragment, not an executable test.

## Known Risks And Follow-Up Work

Implemented hardening:

- Outbound robot-control routes use `authorizeRcsOperatorRequest`; set `RCS_OPERATOR_TOKEN` to require the UI token.
- Optional `RCS_ALLOWED_CLIENT_IPS` can restrict outbound API callers by client IP.
- Inbound callbacks use `authorizeRcsCallbackRequest`; set `RCS_CALLBACK_TOKEN` to require a callback token.
- TLS bypass is no longer global. Use `RCS_ALLOW_INSECURE_TLS=true` only for self-signed private RCS endpoints.
- RCS calls have a timeout via `RCS_REQUEST_TIMEOUT_MS`.
- USB deployment no longer copies `.env.local` unless `USB_COPY_ENV=true`.
- USB deployment can start an HTTPS proxy on `https://IP:3443` when certificates are present.
- Stale 2026 sample deadline/expireTime values were moved to future 2030 samples.

Medium priority:

- Consider removing or marking legacy API routes as deprecated to avoid behavior drift from the generic dispatcher.
- Add tests for `normalizeQrValue`, `buildPayloadFromForm`, `isRcsSuccess`, and `/api/rcs/actions/[apiId]` routing behavior.
- Consider allowing user zoom. `layout.tsx` currently sets `maximumScale: 1` and `userScalable: false`, which can hurt accessibility on mobile.

Lower priority:

- `next.config.ts` prints LAN IPs during build too. In Next 16 config can load multiple times, so build logs show duplicate IP output. Gate printing to development if noisy.
- `subprocess` is imported in `build_usb.py` but not used.
- `public` contains default template SVGs that appear unused.

## Working Rules For Future Agents

- Preserve the catalog-driven design. Prefer adding or editing `RCS_API_CATALOG`, `API_FORM_SCHEMAS`, and `buildPayloadFromForm` instead of hardcoding one-off UI paths.
- Keep operator workflows simple and confirmation-heavy. Commands like cancel, lock, freeze, banish, blockade, and area homing directly affect robot operation.
- Before changing Next.js route handlers, config, build, or deployment conventions, read the local Next 16 docs first.
- Do not commit or expose `.env.local`, certificates, generated `.next`, `USB_Deploy`, logs, or PDFs.
- For mobile QR behavior, test on HTTPS or a trusted context. Browser camera APIs often fail over plain HTTP on phones.
- When testing build without deployment side effects, use `npx next build` instead of `npm run build`.
- If implementing real callback logic, treat callback route handlers as public HTTP endpoints. Validate payloads and authenticate RCS if possible.
<!-- END:rcs-project-memory -->
