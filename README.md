# Bridge UI Interface

## About

This repository contains the web ui for Vortex Bridge.

## Amount validation checks

With Node.js 22.7 or newer (ES module syntax detection enabled):

```sh
npm ci --legacy-peer-deps
npm run test:amount
npm run build
```

The existing lockfile needs `--legacy-peer-deps` because its Wagmi packages have conflicting peer versions.
Manual amount edits stay visible and show an error for signs, exponents, separators or excessive precision.
Approval and transfer actions remain disabled until the amount is corrected. MAX and HALF still floor computed amounts to the route's precision.

## TODO

- if a user selects a chain directly pick the other network (eth->koin, koin->eth)
- Recipient address -> simply connected Koinos wallet?
- validation for recipient address / source tx
- terms of privacy
- terms of service
- Vortex App Link
- Docs Link
