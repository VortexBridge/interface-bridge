# Primary and backup signature collection

Coordinate this interface release with [Vortex V2 issue #11](https://github.com/VortexBridge/vortex-bridge-v2/issues/11)
and the collector/server installation profile. The website never learns the private validator roster in this mode.

```text
VITE_VORTEX_COLLECTION_MODE=collector
VITE_VORTEX_COLLECTORS=https://primary.example.org,https://backup.example.org
VITE_VORTEX_DEPLOYMENT=the-reviewed-deployment
VITE_VORTEX_VALIDATORS=
```

Both endpoints must be distinct HTTPS origins. The deployment identifier must match the configured collectors.
The build rejects validator URLs in collector mode before embedding environment values. Keep all private origins
and VPN identity material on the servers, out of all `VITE_` variables and browser artifacts. Existing installations
default to direct mode unless explicitly configured otherwise. Collector mode has no direct-origin fallback.

For each collection the client preserves the same claim and expiry, streams at most 16 KiB per collector answer,
checks response metadata and bounded slots, recovers every signer against its own claim, checks current destination
membership and deduplicates by signer. Four distinct validators are needed out of five, or all three out of three.
Responses, slot names and counts are untrusted. Existing canonical signature encoding, contract ordering, source
deposit derivation, destination checks and wallet flow remain in place.

A failed, slow, malformed or insufficient primary response triggers the backup once within the overall deadline.
Verified partial results can be combined only for the identical claim/expiry. The default operation deadline is
20 seconds including candidate verification and membership reads, with up to 5 seconds per collector request.
Destination validator-count reads share this same bound. The flows propagate AbortSignal into actual membership/count HTTP calls, preserve Ethereum chain ID and configured fallback weights/quorum, and use Koinos' selected koilib endpoint. The deadline cancels actual network work, not only a Promise.race wait. Custom reusable-client membership callbacks must propagate their supplied `{ signal }`. The page distinguishes signature-service
unavailability, validators not ready, insufficient valid signatures, expiry and timeout. Claim preparation remains
disabled without an independently verified quorum. The destination contract checks again at submission.

## Verification

```sh
npm ci
npm run test:vortex:collector
npm run build
```

The test suite covers both claim encodings, 4-of-5/3-of-3, hostile and duplicate candidates, metadata isolation,
bounded responses, stalled network/membership work and legacy direct mode. `src/v2/vortex-v2.mjs` and `src/v2/membership-rpc.mjs` must remain
byte-identical to the coordinated reusable client in `vortex-bridge-v2/v2/client`.

For rendered checks, run Vite and visit `/test/collector-browser.html`. This fixture uses the actual client,
the same status wording and signature-progress component as Redeem, temporary public test keys and fixture
responses. It supports healthy primary, failed primary, both unavailable, not-ready validators, insufficient
signatures and expired attempts. It loads no wallet extension and sends no chain transaction. The fixture is
outside the production build entry; verify that the production bundle contains no fixture code.

Local fixture results do not satisfy installed pilot acceptance. Before live cutover, both operators must prove
authenticated origin access, external IPv4/IPv6 origin denial, API-only VPN revocation/recovery and public collector certificate renewal/expiry checks, actual primary-host
failure and recovery, current native readiness and both directions in the real rendered site under an approved
signature-request scope. Record remaining common DNS/provider dependencies. Use a compatible collector build
or maintenance state for rollback; never reopen origins or revert to a direct-origin browser configuration.
