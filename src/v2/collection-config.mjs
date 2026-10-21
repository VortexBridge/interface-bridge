// Public transport settings only. Private validator destinations belong on collector hosts.
export function collectionConfig(env) {
  const collectionMode = String(env.VITE_VORTEX_COLLECTION_MODE || "direct");
  if (!["direct", "collector"].includes(collectionMode)) throw new Error("unknown Vortex collection mode");
  const list = (value) => String(value || "").split(",").map((x) => x.trim()).filter(Boolean);
  if (collectionMode === "direct") {
    const validators = list(env.VITE_VORTEX_VALIDATORS);
    return { ready: validators.length > 0, cfg: { collectionMode, validators } };
  }
  if (list(env.VITE_VORTEX_VALIDATORS).length) throw new Error("remove VITE_VORTEX_VALIDATORS from collector builds");
  const collectors = list(env.VITE_VORTEX_COLLECTORS).map((base) => {
    const u = new URL(base);
    if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash || u.pathname !== "/") throw new Error("collector URLs must be HTTPS origins");
    return u.origin;
  });
  const deployment = String(env.VITE_VORTEX_DEPLOYMENT || "");
  if (collectors.length !== 2 || new Set(collectors).size !== 2 || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(deployment)) throw new Error("collector mode requires a deployment and distinct primary/backup URLs");
  return { ready: true, cfg: { collectionMode, collectors, deployment } };
}
