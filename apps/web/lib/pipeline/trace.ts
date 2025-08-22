type LogLevel = "info" | "warn" | "error";

interface TraceEntry {
  timestamp: string;
  component: string;
  level: LogLevel;
  message: string;
  data?: any;
}

const traces = new Map<string, TraceEntry[]>();

export function trace(
  component: string,
  level: LogLevel,
  message: string,
  data?: any
) {
  console.log(`[${component}] ${level.toUpperCase()}: ${message}`, data || "");
}

export function addTrace(
  traceId: string,
  component: string,
  level: LogLevel,
  message: string,
  data?: any
) {
  const entry: TraceEntry = {
    timestamp: new Date().toISOString(),
    component,
    level,
    message,
    data
  };

  if (!traces.has(traceId)) {
    traces.set(traceId, []);
  }
  traces.get(traceId)?.push(entry);

  // Also log to console
  trace(component, level, message, data);
}

export function getTraces(traceId: string): TraceEntry[] {
  return traces.get(traceId) || [];
}

export function clearTraces(traceId: string) {
  traces.delete(traceId);
}