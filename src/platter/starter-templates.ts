import { pricedOptions } from './pricing'

// Built-in examples are versioned source content, never mutable shared templates.
const starters = [
 { id: 'agency', name: 'Agency', service: 'Brand strategy and campaign delivery', discovery: 'Discovery workshop', delivery: 'Campaign production', price: '2400.00' },
 { id: 'consultancy', name: 'Consultancy', service: 'Business assessment and recommendations', discovery: 'Stakeholder interviews', delivery: 'Assessment and action plan', price: '3200.00' },
 { id: 'it-managed-services', name: 'IT managed services', service: 'IT assessment and service onboarding', discovery: 'Systems assessment', delivery: 'Service onboarding', price: '1800.00' },
 { id: 'creative-studio', name: 'Creative studio', service: 'Creative direction and asset production', discovery: 'Creative direction workshop', delivery: 'Asset production', price: '2800.00' },
 { id: 'professional-services', name: 'Professional services', service: 'Professional review and advisory delivery', discovery: 'Requirements review', delivery: 'Advisory report and handover', price: '2600.00' },
]
export const starterTemplates = () => starters.map(({ id, name, service }) => ({ id: 'starter:' + id, name, description: service, version: 1 }))

export function starterTemplate(id: unknown, client: { name: string; email: string }, sender: { email: string }) {
 const starter = starters.find(s => 'starter:' + s.id === id)
 if (!starter) return null
 const values: Record<string, string> = { 'client.name': client.name, 'client.email': client.email, 'sender.email': sender.email }
 // A single pass keeps literal token-shaped text inside client names inert.
 const fill = (value: string) => value.replace(/\{\{(client\.name|client\.email|sender\.email)\}\}/g, (_, key) => values[key])
 const content = {
  title: starter.name + ' proposal',
  scope: fill(starter.service + ' for {{client.name}}. We will confirm requirements, deliver the agreed work and hand over the results. Client contact: {{client.email}}.'),
  terms: fill('Prepared by {{sender.email}} for {{client.name}}. These example prices and terms must be reviewed before approval. Work begins on the mutually agreed date. The balance is due after delivery.'),
  deposit_bps: 3000, currency: 'USD', section_conditions: {},
  options: pricedOptions([{ id: 'one', label: 'Essential', cents: 1 }, { id: 'two', label: 'Extended', cents: 1 }], ['one', 'two'].map(optionId => ({
   optionId, name: starter.name + ' services', lines: [
    { name: starter.discovery, description: fill('Confirm the requirements with {{client.name}}.'), quantity: '1', unit: 'project', unitPrice: '600.00' },
    { name: starter.delivery, description: fill('Deliver the agreed work to {{client.name}}.'), quantity: optionId === 'one' ? '1' : '2', unit: 'project', unitPrice: starter.price },
   ],
  }))),
 }
 return { id, version: 1, content }
}
