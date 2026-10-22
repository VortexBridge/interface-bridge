// Reachability warning only. A reachable collector never proves native validator readiness or quorum.
export async function collectorsUnavailable(collectors, { fetch: request = fetch, signal, timeoutMs = 3000 } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, timeoutMs);
  try {
    const reachable = await Promise.all(collectors.map(async (origin) => {
      try {
        const response = await request(`${origin}/healthz`, {
          signal: controller.signal, cache: "no-store", credentials: "omit", redirect: "error",
        });
        await response.body?.cancel();
        return response.status === 200;
      } catch { return false; }
    }));
    return reachable.length > 0 && reachable.every((value) => !value);
  } finally {
    clearTimeout(timer);
    controller.abort();
    signal?.removeEventListener("abort", abort);
  }
}
