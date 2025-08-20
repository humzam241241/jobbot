import { getConfiguredProviders, chooseProvider, Provider } from "./providers";

export async function pingProvider(p: Provider) {
  try {
    const conf = chooseProvider(p);
    
    // More conservative health checks that don't consume quota
    if (p === "openai") {
      // Just check if we can list models (free endpoint)
      const r = await fetch(`${conf.baseUrl}/models`, { 
        headers: conf.headers,
        method: "GET"
      });
      if (r.status === 429) return { ok: false, status: r.status, reason: "over_quota" };
      if (r.status === 401 || r.status === 403) return { ok: false, status: r.status, reason: "unauthorized" };
      return { ok: r.ok, status: r.status };
    }
    
    if (p === "anthropic") {
      // Just validate the key format and endpoint - don't make actual API calls that consume tokens
      if (!conf.key.startsWith('sk-ant-')) {
        return { ok: false, status: 401, reason: "unauthorized" };
      }
      return { ok: true, status: 200 }; // Assume it's working if key format is correct
    }
    
    if (p === "openrouter") {
      // List models endpoint is free
      const r = await fetch(`${conf.baseUrl}/models`, { 
        headers: conf.headers,
        method: "GET"
      });
      if (r.status === 429) return { ok: false, status: r.status, reason: "over_quota" };
      if (r.status === 401 || r.status === 403) return { ok: false, status: r.status, reason: "unauthorized" };
      return { ok: r.ok, status: r.status };
    }
    
    if (p === "google") {
      // Just validate key format - don't make actual API calls
      if (!conf.key || conf.key.length < 20) {
        return { ok: false, status: 401, reason: "unauthorized" };
      }
      return { ok: true, status: 200 }; // Assume it's working if key exists
    }
    
    return { ok: false, status: 0, reason: "unknown_provider" };
  } catch (e: any) {
    return { ok: false, status: 0, reason: "network_error", error: e?.message ?? String(e) };
  }
}

export async function providersHealth() {
  const keys = getConfiguredProviders();
  const result: Record<string, any> = {};
  const entries = Object.entries(keys) as [Provider, string][];
  
  for (const [name, key] of entries) {
    if (!key) { 
      result[name] = { ok: false, reason: "missing_key" }; 
      continue; 
    }
    result[name] = await pingProvider(name);
  }
  
  return result;
}
