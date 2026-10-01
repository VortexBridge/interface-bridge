// The Solana / Wormhole libraries expect Node's global Buffer. Imported FIRST by helpers/solana.mjs (module order), so
// the global exists before those libraries load; the rest of the site never loads it.
import { Buffer } from "buffer";

if (typeof globalThis.Buffer == "undefined") globalThis.Buffer = Buffer;
