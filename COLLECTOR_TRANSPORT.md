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

The installed website's Content-Security-Policy must permit exactly the two configured public HTTPS origins
in `connect-src`. Keeping an old self-only policy blocks collection even when server-side smoke tests pass.
Keep every other CSP restriction and never add private origins or a wildcard.

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

Redeem also makes two bounded read-only `/healthz` requests when opened. If both are unavailable it shows
a temporary collection warning with Retry; completed transfers remain independently readable. It cancels
these requests on timeout/unmount and shows no positive readiness badge. A reachable collector says
nothing about native validator health, membership or quorum; only verified collection results enable claims.

## Installed pilot, 21 October 2026

The actual private terminal-only VXTEST website uses primary/backup collectors on separate VPS hosts.
Both are operated by Pablo and share his Tailscale control plane. Three original validator identities
remain on their existing single host. This proves a private pilot, not independent operators or custody.
The terminal-only experiment overlay remains separate from this repository's ordinary wallet flow.

Real finalized, already-consumed deposits produced three independently verified current-member signatures
in each direction. Actual primary outage, both-down refusal, recovery and split primary/backup partial
retention passed without a blockchain transaction. The actual rendered site reads both completed deposits,
rejects invalid inputs, preserves paused-state fencing and passes desktop/mobile checks. With both real
collector services stopped it displays the collection warning while the completed receipt remains readable;
restoring only the backup removes the warning and restores verified collection in both directions.

Six rendered unclaimed/signature-state cases use explicit test fixtures. They are not new live transfers.
The installed historical-claim collection checks use the same production client and real native signatures;
already-consumed receipts correctly bypass collection on Redeem. Compatible collector-only website rollback
was exercised with origin restrictions intact. See the coordinated server PR's sanitized installed evidence.
Final pilot sign-off remains pending consistent all-three native readiness. A subsequent owner-authorized,
native-loader-qualified polling-only adjustment uses Koinos 15 seconds and Ethereum 30 seconds, with
three sequential guarded restarts. The original binary, sources, keys, history, quorum and 120-second
signing fence are unchanged. The public Koinos witness still sometimes trails the private primary by
more than 400 blocks. Post-change collection gets 3/3 signatures in Ethereum-to-Koinos and only 2/3 in
the reverse direction; verified partials survive backup fallback and the client correctly refuses the
incomplete quorum. The 600-second observation has all three ready in only 3 of 21 samples, and its
final sample retains an Ethereum source refusal as well. Both pause reads stay true; no source refusal
was waived and no transaction was sent. See `evidence/collector-private-pilot-20261021/installed-native-cadence-20261021.json` for the retained
bounded observation. Collector reachability never substitutes for consistent native readiness.

A later repair affects only the existing Ethereum witness gateway: one same-provider retry of an
identical read on HTTP 408, inside the remaining original transport timeout. Eleven local tests,
an actual recovered 408 and installed paired finalized reads pass; collector/client sources and
native validator processes are unchanged. The patch and installed proof are retained in
`evidence/collector-private-pilot-20261021/installed-ethereum-witness-408-repair.json`.
The first subsequent sample passed Ethereum on all three instances but refused Koinos on two, with
834 blocks between reported finality thresholds. No new 600-second window started from that refusal.
Historical collection obtained 3/3 Ethereum-source signatures and 1/3 Koinos-source signatures;
the client refused the incomplete quorum. Both bridges remained paused. Final acceptance still
requires a stable bounded all-three observation and genuine collection in both directions.

The later complete 600-second observation retained 63/63 native HTTP 200 responses without reported
problems. Nineteen of 21 snapshots had all three exactly caught up; two conservative monitor results
were `catching_up` by 8/6 Koinos blocks and recovered by the next sample. These are not new RPC
failures and are not relabeled ready: the strict all-samples monitor check remains false. Fresh real
collection now verifies 3/3 current members in both directions, both pause reads are true, and both
actual rendered completed receipts pass. See
`evidence/collector-private-pilot-20261021/post-repair-native-window-and-historical-collection.json`.
The pilot remains pending strict readiness acceptance; no client, signing fence or monitor was changed.

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
