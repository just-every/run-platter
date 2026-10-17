// Demo data for `rer demo` and the hosted demo (withDemo runs it once, after the
// owner exists): Lantern Street, a small studio with clients and proposals in
// every state Platter has — drafts from the team and the assistant, an approved
// offer ready to send, sent offers waiting on clients, accepted offers with the
// recorded acceptance and deposit exports. Its first run is finished, so the
// demo opens on the proposals.
import type { Bindings } from './auth.server'
import { seedStudio } from './platter/demo/seed'

export async function seedDemo(env: Bindings, { ownerEmail, now }: { ownerEmail: string; now: Date }): Promise<void> {
  await seedStudio(env, ownerEmail, now)
}
