import React, { useEffect, useState } from 'react';
import { hubspot, Link, Text, Flex, Button } from '@hubspot/ui-extensions';
import type { CrmContext } from '@hubspot/ui-extensions';
import { platterOrigin } from './origin.js';

type Card = { startUrl: string; proposals: { id: string; title: string; status: string; revision: number; url: string }[] };
hubspot.extend<'crm.record.sidebar'>(({ context }) => <PlatterCard context={context} />);
function PlatterCard({ context }: { context: CrmContext }) {
 const [card, setCard] = useState<Card | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
 async function load() {
  setLoading(true); setError(''); setCard(null);
  try {
   const query = new URLSearchParams({ dealId: String(context.crm.objectId), objectTypeId: context.crm.objectTypeId });
   const response = await hubspot.fetch(platterOrigin + '/api/platter/crm/card?' + query, { method: 'GET' });
   if (!response.ok) throw Error('Authorize this app in Platter Settings and use a current Platter owner or admin account.');
   setCard(await response.json() as Card);
  } catch (failure) { setError(failure instanceof Error ? failure.message : 'The Platter card could not be loaded.'); }
  finally { setLoading(false); }
 }
 useEffect(() => { void load(); }, [context.crm.objectId]);
 return <Flex direction="column" gap="small">
  {loading && <Text>Loading linked proposals…</Text>}
  {error && <Text>{error}</Text>}
  {card && <><Link href={{ url: card.startUrl, external: true }}>Start a reviewed proposal</Link>
   {card.proposals.length === 0 && <Text>No linked proposals yet.</Text>}
   {card.proposals.map(p => <Flex direction="column" key={p.id}><Link href={{ url: p.url, external: true }}>{p.title}</Link><Text>{p.status} · revision {p.revision}</Text></Flex>)}</>}
  <Button onClick={() => { void load(); }} disabled={loading}>Refresh proposals</Button>
 </Flex>;
}
