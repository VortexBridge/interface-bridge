import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

async function textFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await textFiles(file));
    else if (/\.(?:html|js|css|json|txt|conf)$/.test(entry.name)) result.push(file);
  }
  return result;
}

async function assertAbsent(directory, prohibited) {
  const files = await textFiles(directory);
  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const marker of prohibited) {
      if (content.includes(marker)) throw new Error(`${path.relative(process.cwd(), file)} contains prohibited marker ${JSON.stringify(marker)}`);
    }
  }
}

await assertAbsent("build/public", [
  "Connect your operator",
  "/v1/instances",
  "Private validator administration",
  "operator-artifact.json",
]);
await assertAbsent("build/operator", [
  'to="/bridge"',
  'to="/redeem"',
  "walletconnect-koinos-sdk-js",
  "WalletConnect",
  "Vortex Bridge - Bridging Koinos To The World",
]);

const publicDocument = await readFile("build/public/index.html", "utf8");
const operatorDocument = await readFile("build/operator/index.html", "utf8");
if (!publicDocument.includes("Vortex Bridge")) throw new Error("public artifact title is missing");
if (!operatorDocument.includes("Vortex Operator")) throw new Error("operator artifact title is missing");
console.log("public/operator artifact boundaries verified");
