// The demo's sample studio: Fernhill Design Studio, Ben Whitfield's brand, menu, signage and web studio in
// Austin, Texas, with fifteen local clients and offers in every state Platter has. Bluebonnet Café's brand
// refresh, drafted by the agent from the firm's catalog, is the homepage's story. Times are days before `now`;
// the firm works in Central time and prices in USD.

export type Preparer = 'owner' | 'member' | 'agent'
export interface Revision { at: number; by: Preparer; scope: string; terms?: string; one: [string, string]; two: [string, string] }
export interface SampleProposal {
  n: number
  client: number
  title: string
  deposit: string
  revisions: Revision[]
  /** Approvals by the owner: [revision, days ago]. A revise clears the earlier one. */
  approvals?: [number, number][]
  sent?: number
  /** The client opened the link and asked for a verification code. */
  codeRequested?: number
  accepted?: { at: number; option: 'one' | 'two'; name: string }
  exported?: number
}

export const member = { n: 1, email: 'ana@fernhilldesign.example', name: 'Ana Reyes', joined: 140 }
export const owner = { name: 'Ben Whitfield', timeZone: 'America/Chicago' }
export const keys = [
  { n: 1, label: 'Proposal assistant', created: 9 },
  { n: 2, label: 'Intake form bot', created: 70, revoked: 41 },
]

export const clients: [number, string, string][] = [
  [1, 'Bluebonnet Café', 'rosa@bluebonnetcafe.example'],
  [2, 'Pecan Street Bakery', 'lucy@pecanstreetbakery.example'],
  [3, 'Lone Star Pediatric Dental', 'office@lonestarpediatric.example'],
  [4, 'Barton Creek Yoga', 'studio@bartoncreekyoga.example'],
  [5, 'Cedar & Sage Florals', 'june@cedarsageflorals.example'],
  [6, 'Rio Verde Taqueria', 'marisol@rioverdetaqueria.example'],
  [7, 'Hill Country Physical Therapy', 'admin@hillcountrypt.example'],
  [8, 'Moonlight Tower Records', 'shop@moonlighttower.example'],
  [9, 'Zilker Bike Co.', 'team@zilkerbike.example'],
  [10, 'South Congress Law Group', 'office@socolaw.example'],
  [11, 'Mueller Family Dentistry', 'hello@muellerdentistry.example'],
  [12, 'Lady Bird Coffee Roasters', 'avery@ladybirdcoffee.example'],
  [13, 'Riverside Credit Union', 'marketing@riversidecu.example'],
  [14, 'Eastside Climbing Gym', 'hello@eastsideclimbing.example'],
  [15, 'Travis Heights Montessori', 'office@travisheights.example'],
]

/** Fernhill's catalog as moved in from its old proposal tool (Platter's catalog CSV columns). */
export const catalog = [
  ['FD-101', 'Logo refresh', '2400.00', '1420.00', 'Brand', '', ''],
  ['FD-105', 'Brand palette', '800.00', '460.00', 'Brand', '', ''],
  ['FD-110', 'Brand guidelines', '1000.00', '590.00', 'Brand', '', ''],
  ['FD-120', 'Menu design', '1500.00', '870.00', 'Print', '', ''],
  ['FD-130', 'Interior graphics', '800.00', '460.00', 'Environments', '', ''],
  ['FD-140', 'Exterior signage', '1800.00', '1050.00', 'Environments', '', ''],
  ['FD-150', 'Website updates', '1500.00', '880.00', 'Digital', '', ''],
  ['FD-160', 'Menu boards', '600.00', '310.00', 'Print', 'ea', 'yes'],
  ['FD-170', 'Window vinyl', '800.00', '420.00', 'Environments', '', ''],
  ['FD-180', 'Social templates', '500.00', '260.00', 'Digital', '', ''],
]
export const catalogCsv = 'id,name,sku,price,currency,cost,category,unit_name,tax_exempt\n' + catalog.map(([id, name, price, cost, category, unit, exempt]) => [id, name, id, price, 'USD', cost, category, unit, exempt].join(',')).join('\n')

const lines = (...items: string[]) => items.map(item => `• ${item}`).join('\n')

export const proposals: SampleProposal[] = [
  // Accepted, deposit exported.
  { n: 1, client: 2, title: 'Pecan Street Bakery · packaging refresh', deposit: '50', revisions: [{ at: 19, by: 'owner', one: ['Box and bag set', '3200.00'], two: ['Box, bag and cake labels', '4600.00'], scope: `Packaging for the bakery's holiday season.\n\n${lines('Pastry box and paper bag artwork, two sizes', 'Print-ready files and a press check in Austin', 'Labels option adds: 6 cake and cookie labels with ingredient panels')}` }], approvals: [[1, 18]], sent: 18, accepted: { at: 12, option: 'two', name: 'Lucy Tran' }, exported: 11 },
  { n: 2, client: 13, title: 'Riverside Credit Union · branch signage', deposit: '30', revisions: [{ at: 33, by: 'owner', one: ['Lobby signage', '6800.00'], two: ['Lobby and drive-thru signage', '9450.00'], scope: `Signage for the Riverside Drive branch reopening.\n\n${lines('Lobby feature wall and teller signs', 'Rate boards and ADA room signs', 'Drive-thru option adds: canopy fascia and two lane signs with permit drawings')}` }], approvals: [[1, 31]], sent: 31, accepted: { at: 26, option: 'two', name: 'Marcus Webb' }, exported: 25 },
  { n: 3, client: 7, title: 'Hill Country PT · website refresh', deposit: '40', revisions: [{ at: 52, by: 'member', one: ['Refresh', '5200.00'], two: ['Refresh with online booking', '7900.00'], scope: `A faster, clearer site for the Round Rock and Lakeway clinics.\n\n${lines('Content audit and sitemap', 'Design for 7 page templates, desktop and phone', 'Build on the existing CMS, moving 24 pages', 'Booking option adds: online booking and therapist profiles', 'Two weeks of fixes after launch')}` }], approvals: [[1, 50]], sent: 50, accepted: { at: 44, option: 'one', name: 'Dr. Sam Okafor' }, exported: 43 },
  { n: 4, client: 11, title: 'Mueller Family Dentistry · office signage', deposit: '50', revisions: [{ at: 71, by: 'owner', one: ['Reception wall', '3100.00'], two: ['Reception and wayfinding', '5600.00'], scope: `Signage for the new Mueller office on Aldrich Street.\n\n${lines('Reception feature wall, brushed aluminum letters', 'Window decals and office hours', 'Wayfinding option adds: 11 room and hallway signs')}` }], approvals: [[1, 70]], sent: 70, accepted: { at: 63, option: 'two', name: 'Dr. Lena Ruiz' }, exported: 62 },
  { n: 5, client: 10, title: 'South Congress Law Group · letterhead and templates', deposit: '50', revisions: [{ at: 88, by: 'member', one: ['Core set', '1850.00'], two: ['Core set and pitch deck', '3400.00'], scope: `Templates the whole firm can use in Word.\n\n${lines('Letterhead, memo and file note', 'Engagement letter and fee agreement layouts', 'Email signature', 'Deck option adds: a 20-slide pitch deck master')}` }], approvals: [[1, 86]], sent: 86, accepted: { at: 80, option: 'one', name: 'Dana Price' }, exported: 79 },
  { n: 6, client: 12, title: 'Lady Bird Coffee · bag and label system', deposit: '25', revisions: [{ at: 104, by: 'owner', one: ['Core bags', '3600.00'], two: ['Bags and seasonal labels', '6200.00'], scope: `A bag system for Lady Bird's wholesale coffee.\n\n${lines('12 oz and 2 lb bag artwork', 'Roast and origin label template', 'Seasonal option adds: 4 limited-release labels and a shelf talker')}` }], approvals: [[1, 102]], sent: 102, accepted: { at: 97, option: 'two', name: 'Avery Chen' }, exported: 96 },
  // Accepted, deposit invoice not exported yet.
  { n: 7, client: 6, title: 'Rio Verde Taqueria · menu redesign', deposit: '25', revisions: [{ at: 9, by: 'agent', one: ['Menu design', '1500.00'], two: ['Menu design and menu boards', '2700.00'], scope: `A new menu for the East Cesar Chavez taqueria.\n\n${lines('Menu layout, English and Spanish', 'Photography direction for 8 plates', 'Menu boards option adds: 2 printed and installed menu boards')}` }], approvals: [[1, 8]], sent: 8, accepted: { at: 3, option: 'two', name: 'Marisol Vega' } },
  { n: 8, client: 5, title: 'Cedar & Sage Florals · storefront window vinyl', deposit: '30', revisions: [{ at: 6, by: 'owner', one: ['Front window', '800.00'], two: ['Front and side windows', '1350.00'], scope: `Window graphics for the Burnet Road shop.\n\n${lines('Front window vinyl with hours and logo', 'Installation before Saturday opening', 'Side window option adds: a frosted privacy band with florals')}` }], approvals: [[1, 5]], sent: 5, accepted: { at: 2, option: 'one', name: 'June Alvarez' } },
  // Sent: waiting on the client.
  { n: 9, client: 4, title: 'Barton Creek Yoga · class schedule and social kit', deposit: '30', revisions: [{ at: 4, by: 'owner', one: ['Schedule posters', '640.00'], two: ['Posters and social templates', '1140.00'], scope: `Fall class schedule for the studio.\n\n${lines('11 x 17 and 18 x 24 poster layouts', '200 printed 11 x 17 posters', 'Social option adds: 6 square posts and story templates')}` }], approvals: [[1, 4]], sent: 4, codeRequested: 1 },
  { n: 10, client: 8, title: 'Moonlight Tower Records · in-store graphics', deposit: '30', revisions: [{ at: 8, by: 'member', one: ['Interior graphics', '2400.00'], two: ['Interior graphics and window vinyl', '3200.00'], scope: `Graphics for the record store's new listening room.\n\n${lines('Genre wall headers and bin cards', 'Listening room mural, 14 ft', 'Window option adds: front window vinyl for the Saturday sale')}` }], approvals: [[1, 7]], sent: 7 },
  { n: 11, client: 9, title: 'Zilker Bike Co. · catalog layout', deposit: '50', revisions: [
    { at: 16, by: 'owner', one: ['Catalog layout', '980.00'], two: ['Layout and product photography', '1650.00'], scope: `The 2027 bike catalog.\n\n${lines('24-page layout, print and web', 'Photography option adds: studio shots of 18 bikes')}` },
    { at: 14, by: 'owner', one: ['Catalog layout', '1080.00'], two: ['Layout and product photography', '1750.00'], scope: `The 2027 bike catalog.\n\n${lines('28-page layout, print and web', 'Photography option adds: studio shots of 18 bikes')}` },
  ], approvals: [[1, 15], [2, 13]], sent: 13 },
  { n: 12, client: 14, title: 'Eastside Climbing Gym · wall graphics', deposit: '25', revisions: [{ at: 2, by: 'owner', one: ['Lobby wall', '4100.00'], two: ['Lobby and bouldering room', '6900.00'], scope: `Wall graphics for the gym's second location.\n\n${lines('Lobby wall graphic, 40 ft', 'Route-grade signs', 'Bouldering option adds: a full-height mural in the bouldering room')}` }], approvals: [[1, 2]], sent: 1.8 },
  // Approved by the owner, ready to send.
  { n: 13, client: 15, title: 'Travis Heights Montessori · open house posters', deposit: '50', revisions: [{ at: 1, by: 'member', one: ['Posters', '520.00'], two: ['Posters and banners', '980.00'], scope: `Promotion for the November open house.\n\n${lines('Poster design, 11 x 17 and 8.5 x 11', '150 printed posters', 'Banner option adds: two 10 ft vinyl banners for the school fence')}` }], approvals: [[1, 0.2]] },
  { n: 14, client: 3, title: 'Lone Star Pediatric Dental · website', deposit: '30', revisions: [
    { at: 7, by: 'owner', one: ['Website', '6400.00'], two: ['Website and photography', '9800.00'], scope: `A website for the practice's three Austin offices.\n\n${lines('Design for home, services, offices, team and new patients', 'Build with an editable team library', 'Photography option adds: 3 offices and the team, 40 photographs')}` },
    { at: 3, by: 'owner', one: ['Website', '6400.00'], two: ['Website and photography', '11200.00'], scope: `A website for the practice's three Austin offices.\n\n${lines('Design for home, services, offices, team and new patients', 'Build with an editable team library', 'Photography option adds: 3 offices, the team and a kids-day shoot, 55 photographs')}` },
  ], approvals: [[1, 6], [2, 1]] },
  // Drafts: prepared by the team and the agent, waiting for the owner.
  { n: 15, client: 1, title: 'Bluebonnet Café · brand refresh', deposit: '50', revisions: [{ at: 0.007, by: 'agent', one: ['Good', '4200.00'], two: ['Better', '6500.00'], scope: `A brand refresh for Bluebonnet Café on South Lamar, priced from the Fernhill catalog.\n\n${lines('Good: logo refresh, brand palette and brand guidelines; 3 concepts, 2 rounds of changes', 'Better: everything in Good, plus menu design and interior graphics; 4 concepts, 3 rounds', 'Printed menu boards (FD-160) are not included')}`, terms: 'Balance due on delivery of final files. Printed goods are quoted separately.' }] },
  { n: 16, client: 10, title: 'South Congress Law Group · brand identity', deposit: '40', revisions: [
    { at: 12, by: 'member', one: ['Refresh', '7500.00'], two: ['Refresh and rollout', '12400.00'], scope: `A refreshed identity for the firm's 15th year.\n\n${lines('Discovery workshop (half day)', 'Two logo routes, one refined', 'Color, type and a 12-page guide', 'Rollout option adds: signage, stationery and website templates')}` },
    { at: 5, by: 'member', one: ['Refresh', '7900.00'], two: ['Refresh and rollout', '12900.00'], scope: `A refreshed identity for the firm's 15th year.\n\n${lines('Discovery workshop (half day)', 'Two logo routes, one refined', 'Color, type and a 16-page guide', 'Rollout option adds: signage, stationery and website templates')}` },
    { at: 0.3, by: 'member', one: ['Refresh', '7900.00'], two: ['Refresh and rollout', '13600.00'], scope: `A refreshed identity for the firm's 15th year.\n\n${lines('Discovery workshop (half day)', 'Two logo routes, one refined', 'Color, type and a 16-page guide', 'Rollout option adds: signage, stationery, website templates and a lobby wall')}` },
  ], approvals: [[1, 10]] },
  { n: 17, client: 5, title: "Cedar & Sage Florals · Mother's Day campaign", deposit: '50', revisions: [{ at: 0.15, by: 'member', one: ['In-store', '1450.00'], two: ['In-store and social', '2300.00'], scope: `A Mother's Day campaign for the shop.\n\n${lines('Window graphics and sidewalk sign posters', 'Gift card design', 'Social option adds: a styled flat-lay shoot and 10 posts')}` }] },
  { n: 18, client: 9, title: 'Zilker Bike Co. · spring social content', deposit: '30', revisions: [{ at: 1.5, by: 'agent', one: ['Monthly content', '1800.00'], two: ['Monthly content and reels', '2900.00'], scope: `A month of social content for the spring range.\n\n${lines('12 posts with copy, scheduled', 'One half-day content shoot on the Lady Bird Lake trail', 'Reels option adds: four 20-second reels')}` }] },
]
