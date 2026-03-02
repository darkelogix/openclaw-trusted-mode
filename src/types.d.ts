// src/types.d.ts — Stub for OpenClaw runtime (fixes build)

declare module '@openclaw/core' {
  export interface BeforeToolCallResult {
    block?: boolean;
    blockReason?: string;
    params?: Record<string, any>;
  }

  export interface PluginApi {
    config: any;
    on(event: string, handler: (event: any) => Promise<BeforeToolCallResult | void>): void;
  }

  export interface ToolCallEvent {
    toolName: string;
    params: any;
  }
}
