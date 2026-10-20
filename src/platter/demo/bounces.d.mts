import type { Bindings } from '../../auth.server'
export function reportBounces(env: Bindings, bounces: { mailId: string; recipient: string; at: number }[]): Promise<void>
