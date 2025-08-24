export class UserInputError extends Error { status = 400 as const; constructor(msg:string){ super(msg); this.name = 'UserInputError'; } }
export class ProviderError extends Error { status = 502 as const; detail: any; constructor(msg:string, detail?:any){ super(msg); this.name = 'ProviderError'; this.detail = detail; } }
export class ServerError extends Error { status = 500 as const; constructor(msg:string){ super(msg); this.name = 'ServerError'; } }

export function toHttpResponse(e: any) {
  const status = e?.status ?? (e instanceof UserInputError ? 400 : e instanceof ProviderError ? 502 : 500);
  const body = {
    success: false,
    error: {
      name: e?.name || e?.code || "Error",
      message: e?.message || "Unknown error",
      code: e?.code,
      detail: e?.detail || e?.data || undefined
    }
  };
  return { status, body } as const;
}



