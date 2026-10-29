import { hash, type Actor } from './model'

export type AgentSource = { kind: string; id: string; version: string; digest: string }

/** Cite the actual projection read by a tool, never an asserted caller citation. */
export async function citeAgentSource(actor: Actor, kind: string, id: string, version: unknown, value: unknown) {
 if (!actor.agentSources) return
 const source = { kind, id, version: String(version ?? 'not recorded'), digest: await hash(JSON.stringify(value)) }
 if (!actor.agentSources.some(s => s.kind === kind && s.id === id && s.version === source.version && s.digest === source.digest)) actor.agentSources.push(source)
}

export async function citeAgentContext(actor: Actor, value: any) {
 if (!actor.agentSources) return
 // The context digest also covers settings and empty collections. Individual
 // citations identify the records present at this read, before a later edit.
 await citeAgentSource(actor, 'context', 'workspace', null, value)
 for (const [field, kind] of [['clients','client'],['proposals','proposal'],['templates','template'],['starterTemplates','starter-template']] as const)
  for (const row of value[field] ?? []) await citeAgentSource(actor, kind, row.id, row.revision ?? row.version, row)
}
