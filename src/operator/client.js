// Management credentials live only in this page's memory, never browser storage.
export function createOperatorClient(endpoint, token) {
  const url = new URL(endpoint);
  if (url.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error("Use a loopback HTTP address, such as http://127.0.0.1:3021. Tunnel remote operators to this computer.");
  }
  if (!/^[a-f0-9]{64}$/.test(token)) throw new Error("Enter the 64-character token from your private operator access-token file.");
  return async (path, body) => {
    if (!path.startsWith("/v1/")) throw new Error("Invalid operator API path");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    try {
      const response = await fetch(url.origin + path, {
        method: body === undefined ? "GET" : "POST",
        headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: "omit", redirect: "error", cache: "no-store", signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Operator returned HTTP ${response.status}`);
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("Operator request timed out. Check the local service or SSH tunnel.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
}

export function observedStatus(observation, now = Date.now()) {
  if (!observation) return "unknown";
  const timestamp = Date.parse(observation.observedAt);
  if (!Number.isFinite(timestamp) || now - timestamp > 30000 || timestamp > now + 5000) return "stale";
  return observation.status;
}

export function exportJSON(name, value) {
  const blob = new Blob([JSON.stringify(value, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
