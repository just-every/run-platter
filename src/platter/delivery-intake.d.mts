import type { Bindings } from '../auth.server'
export function deliveryIntake(env: Bindings): { ingestWebhook(input: { rawBody: Uint8Array; headers: Headers }): Promise<unknown> }
