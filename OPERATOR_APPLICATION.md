# Separate Vortex applications

This repository produces two independent browser applications from reviewed
shared source. The public artifact contains Bridge, Redeem and Terms pages. The
private operator artifact contains validator administration only and does not
initialize RainbowKit, Wagmi, WalletConnect or the end-user Koinos wallet script.

## Development and verification

Install the committed dependencies, then start exactly one application per
origin:

```sh
npm ci --legacy-peer-deps --ignore-scripts
npm run dev:public      # http://127.0.0.1:5173
npm run dev:operator    # http://127.0.0.1:5174
```

Build both applications and verify that prohibited modules and routes did not
cross the artifact boundary:

```sh
npm run build:all
npm run preview:public    # http://127.0.0.1:4173
npm run preview:operator  # http://127.0.0.1:4174
```

`npm run build` is intentionally an alias for `build:public`. The Dockerfile and
Netlify configuration publish only `build/public`; they never fall back to a
combined directory. Public `/operate` visits show the public 404 page. Private
`/bridge` and `/redeem` visits show the operator application's missing-page view.

## Private operator artifact

Run `npm run package:operator` on a reviewed build machine. It creates a
versioned `artifacts/vortex-operator-ui-*.tar.gz`, an adjacent SHA-256 file and
an unsigned component-`operator` release-manifest template. The
archive contains prebuilt static assets under `site/`, an API compatibility
record in `site/operator-artifact.json`, installation notes, and a loopback-only
nginx example. The validator host does not need Node or source code.

The unsigned template binds the archive digest, source commit, release sequence,
operator API `v1` codec and rollback instruction. It must pass the normal
publisher-signature threshold and a separate local operator approval before host
installation; the template and SHA-256 file do not grant authority. Verify the
archive digest before extracting it into a versioned directory under
`/opt/vortex-operator-ui/releases/`. Point `/opt/vortex-operator-ui/current` to
the reviewed directory, install the supplied nginx configuration, run
`nginx -t`, then reload nginx. Keep old reviewed directories for rollback. The
example sends a restrictive CSP, blocks framing, disables caching, and listens
only on `127.0.0.1:5174`.

`npm run test:operator-rollout` packages the UI, checks the manifest/archive
binding, swaps two compatible static release directories and restores the prior
one, and rejects an API-v2-only artifact. The static symlink change never invokes
the validator service. The operator UI also compares the service and capability
API versions at connection time and refuses a missing or incompatible version.

Start `vortex-operator` with its default loopback API and exact UI origin. For a
remote host, forward both loopback ports over SSH. The access token remains in
page memory and is not stored in local storage, cookies or a service worker.
Public and operator theme settings use different storage keys.

A Tailscale route is optional and is not enabled by this first package. Enabling
one requires authenticated TLS, an exact private operator origin configured in
the service, the same bearer-token authorization, and host controls independent
of Tailscale. It also requires a reviewed client change because the current UI
accepts only a loopback HTTP API. Never expose the management API through the
public bridge proxy or treat private-network membership as operator authority.
