// The demo's sample studio: Lantern Street, a five-person brand, web and
// photography studio. Clients and offers follow the homepage's story (Saltbush
// Bakery's spring photography, Essentials or Campaign) and the repo's fixtures
// (Northstar Coffee, River & Pine, Longhouse). Times are days before `now`.

export type Preparer = 'owner' | 'member' | 'agent'
export interface Revision { at: number; by: Preparer; scope: string; one: [string, string]; two: [string, string] }
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

export const member = { n: 1, email: 'theo@lanternstreet.example', name: 'Theo Park', joined: 140 }
export const keys = [
  { n: 1, label: 'Proposal assistant', created: 9 },
  { n: 2, label: 'Intake form bot', created: 70, revoked: 41 },
]

export const clients: [number, string, string][] = [
  [1, 'Saltbush Bakery', 'priya@saltbush.example'],
  [2, 'Northstar Coffee', 'avery@northstar.example'],
  [3, 'River & Pine, Studio', 'hello@riverpine.example'],
  [4, 'Longhouse Studio', 'hello@longhouse.example'],
  [5, 'Harbourline Ferries', 'marketing@harbourline.example'],
  [6, 'Kestrel Physio', 'admin@kestrelphysio.example'],
  [7, 'Bellbird Wines', 'cellar@bellbird.example'],
  [8, 'Marlow Legal', 'office@marlowlegal.example'],
  [9, 'Copperleaf Dental', 'hello@copperleaf.example'],
  [10, 'Ostro Bikes', 'team@ostrobikes.example'],
  [11, 'Tidewater Yoga', 'studio@tidewater.example'],
  [12, 'Chen Architecture', 'jordan@chenarchitecture.example'],
  [13, 'Fernhill Primary P&C', 'pandc@fernhill.example'],
  [14, 'Wattle & Co. Florists', 'orders@wattleco.example'],
  [15, 'Greenway Landscapes', 'office@greenway.example'],
]

const lines = (...items: string[]) => items.map(item => `• ${item}`).join('\n')

export const proposals: SampleProposal[] = [
  // Accepted, deposit exported: the homepage's story.
  { n: 1, client: 1, title: 'Spring menu photography', deposit: '25', revisions: [{ at: 19, by: 'owner', one: ['Essentials', '2400.00'], two: ['Campaign', '4200.00'], scope: `Photography for the spring menu launch at both Saltbush shops.\n\n${lines('Pre-production call and shot list (1 hour)', 'Half-day shoot at the Brunswick shop, natural light', 'Food styling for 12 menu items', '20 edited photographs for menu boards and web', 'Campaign adds: second half-day for people and process, 40 edited photographs, 6 short vertical clips for social', '12-month usage licence, all channels')}` }], approvals: [[1, 18]], sent: 18, accepted: { at: 12, option: 'two', name: 'Priya Shah' }, exported: 11 },
  { n: 2, client: 5, title: 'Summer timetable campaign', deposit: '30', revisions: [{ at: 33, by: 'owner', one: ['Print and digital', '6800.00'], two: ['Print, digital and wharf signage', '9450.00'], scope: `Campaign artwork for the December–February timetable.\n\n${lines('Key visual and headline routes (2 rounds)', 'Timetable layout for the website and app', 'A2 posters for 9 wharves, print-ready', 'Social kit: 8 static posts, 4 stories', 'Signage option adds: 14 wharf panels with install drawings')}` }], approvals: [[1, 31]], sent: 31, accepted: { at: 26, option: 'two', name: 'Dana Whitfield' }, exported: 25 },
  { n: 3, client: 6, title: 'Website refresh', deposit: '40', revisions: [{ at: 52, by: 'member', one: ['Refresh', '5200.00'], two: ['Refresh with booking flow', '7900.00'], scope: `A faster, clearer site for the two clinics.\n\n${lines('Content audit and sitemap', 'Design for 7 page templates, desktop and mobile', 'Build on the existing CMS, with migration of 24 pages', 'Booking option adds: online booking flow and practitioner profiles', 'Two weeks of fixes after launch')}` }], approvals: [[1, 50]], sent: 50, accepted: { at: 44, option: 'one', name: 'Sam Okafor' }, exported: 43 },
  { n: 4, client: 9, title: 'Clinic signage', deposit: '50', revisions: [{ at: 71, by: 'owner', one: ['Reception wall', '3100.00'], two: ['Reception and wayfinding', '5600.00'], scope: `Signage for the new Copperleaf clinic.\n\n${lines('Reception feature wall, brushed aluminium letters', 'Window decals and opening hours', 'Wayfinding option adds: 11 room and corridor signs')}` }], approvals: [[1, 70]], sent: 70, accepted: { at: 63, option: 'two', name: 'Dr Lena Ruiz' }, exported: 62 },
  { n: 5, client: 8, title: 'Letterhead and document templates', deposit: '50', revisions: [{ at: 88, by: 'member', one: ['Core set', '1850.00'], two: ['Core set and pitch deck', '3400.00'], scope: `Templates the whole firm can use in Word.\n\n${lines('Letterhead, memo and file note', 'Fee agreement and engagement letter layouts', 'Email signature', 'Deck option adds: 20-slide pitch deck master')}` }], approvals: [[1, 87]], sent: 87, accepted: { at: 80, option: 'one', name: 'Gareth Marlow' }, exported: 79 },
  { n: 6, client: 3, title: 'Autumn lookbook photography', deposit: '25', revisions: [{ at: 104, by: 'owner', one: ['Studio day', '3600.00'], two: ['Studio and location', '6200.00'], scope: `Lookbook for River & Pine's autumn furniture range.\n\n${lines('One studio day with two sets', '30 edited photographs, cut-outs for 12 products', 'Location option adds: a day at a styled home in Castlemaine, 25 more photographs')}` }], approvals: [[1, 103]], sent: 103, accepted: { at: 98, option: 'two', name: 'Mia Larsen' }, exported: 97 },
  // Accepted, deposit invoice not exported yet.
  { n: 7, client: 2, title: 'Northstar brand photography', deposit: '25', revisions: [{ at: 9, by: 'agent', one: ['Studio essentials', '2400.00'], two: ['Full campaign', '4200.00'], scope: `One studio shoot, edited photographs, and usage licence.\n\n${lines('Half-day studio shoot: bags, cups and the roaster', '25 edited photographs', 'Full campaign adds: café location half-day, barista portraits, 20 more photographs', '12-month usage licence')}` }], approvals: [[1, 8]], sent: 8, accepted: { at: 2, option: 'one', name: 'Avery Morgan' } },
  { n: 8, client: 7, title: 'Cellar door signage', deposit: '30', revisions: [{ at: 6, by: 'owner', one: ['Cellar door', '2750.00'], two: ['Cellar door and roadside', '4300.00'], scope: `New signage for the Bellbird cellar door.\n\n${lines('Entry sign, timber and steel', 'Tasting bar menu board', 'Roadside option adds: two double-sided roadside signs with council drawings')}` }], approvals: [[1, 5]], sent: 5, accepted: { at: 1, option: 'two', name: 'Tom Hadley' } },
  // Sent: waiting on the client.
  { n: 9, client: 3, title: 'Showroom launch film', deposit: '30', revisions: [{ at: 4, by: 'owner', one: ['60-second film', '5400.00'], two: ['Film and social cut-downs', '7200.00'], scope: `A short film for the Collingwood showroom opening.\n\n${lines('Concept and storyboard', 'One shoot day with a two-person crew', '60-second film with licensed music', 'Social option adds: three 15-second vertical cut-downs and captions')}` }], approvals: [[1, 3]], sent: 3, codeRequested: 0.1 },
  { n: 10, client: 8, title: 'Website copy and team photography', deposit: '30', revisions: [{ at: 8, by: 'member', one: ['Copy', '3200.00'], two: ['Copy and team photography', '5150.00'], scope: `New words and faces for Marlow Legal's practice-area pages.\n\n${lines('Interviews with 4 partners', 'Copy for 9 practice-area pages and the home page', 'Photography option adds: portraits of 14 staff and 10 office photographs')}` }], approvals: [[1, 6]], sent: 6 },
  { n: 11, client: 9, title: 'Patient brochure reprint', deposit: '50', revisions: [
    { at: 16, by: 'owner', one: ['Reprint as is', '980.00'], two: ['Update and reprint', '1650.00'], scope: `Reprint of the new-patient brochure.\n\n${lines('2,000 copies, 8 pages, 150gsm silk', 'Update option adds: new fees page and updated team photographs')}` },
    { at: 14, by: 'owner', one: ['Reprint as is', '1080.00'], two: ['Update and reprint', '1750.00'], scope: `Reprint of the new-patient brochure.\n\n${lines('2,500 copies, 8 pages, 150gsm silk', 'Update option adds: new fees page and updated team photographs')}` },
  ], approvals: [[1, 15], [2, 13]], sent: 13 },
  { n: 12, client: 10, title: 'Product catalogue shoot', deposit: '25', revisions: [{ at: 2, by: 'owner', one: ['Catalogue', '4100.00'], two: ['Catalogue and riding shots', '6900.00'], scope: `The 2027 range, photographed for the catalogue and web shop.\n\n${lines('Studio shoot for 18 bikes, 3 angles each', 'Detail shots for components', 'Riding option adds: a morning on the Yarra trail with two riders')}` }], approvals: [[1, 1.2]], sent: 1 },
  // Approved by the owner, ready to send.
  { n: 13, client: 11, title: 'Class timetable posters', deposit: '50', revisions: [{ at: 1, by: 'member', one: ['Posters', '640.00'], two: ['Posters and social kit', '1120.00'], scope: `Seasonal timetable posters for the studio and the café next door.\n\n${lines('A3 and A2 poster layouts', '200 printed A3 posters', 'Social option adds: 6 square posts and story templates')}` }], approvals: [[1, 0.2]] },
  { n: 14, client: 12, title: 'Portfolio website', deposit: '30', revisions: [
    { at: 7, by: 'owner', one: ['Portfolio site', '6400.00'], two: ['Portfolio site and photography', '9800.00'], scope: `A portfolio site for Chen Architecture.\n\n${lines('Design for home, projects, project detail, studio and contact', 'Build with an editable project library', 'Photography option adds: 4 completed homes, 15 photographs each')}` },
    { at: 3, by: 'owner', one: ['Portfolio site', '6400.00'], two: ['Portfolio site and photography', '11200.00'], scope: `A portfolio site for Chen Architecture.\n\n${lines('Design for home, projects, project detail, studio and contact', 'Build with an editable project library', 'Photography option adds: 5 completed homes, 15 photographs each, twilight exteriors')}` },
  ], approvals: [[1, 6], [2, 1]] },
  // Drafts: prepared by the team and the assistant, waiting for the owner.
  { n: 15, client: 4, title: 'Brand identity refresh', deposit: '40', revisions: [
    { at: 12, by: 'member', one: ['Refresh', '7500.00'], two: ['Refresh and rollout', '12400.00'], scope: `A refreshed identity for Longhouse Studio.\n\n${lines('Discovery workshop (half day)', 'Two logo routes, one refined', 'Colour, type and a 12-page guide', 'Rollout option adds: signage, stationery and website templates')}` },
    { at: 5, by: 'member', one: ['Refresh', '7900.00'], two: ['Refresh and rollout', '12900.00'], scope: `A refreshed identity for Longhouse Studio.\n\n${lines('Discovery workshop (half day)', 'Two logo routes, one refined', 'Colour, type and a 16-page guide', 'Rollout option adds: signage, stationery and website templates')}` },
    { at: 0.3, by: 'member', one: ['Refresh', '7900.00'], two: ['Refresh and rollout', '13600.00'], scope: `A refreshed identity for Longhouse Studio.\n\n${lines('Discovery workshop (half day)', 'Two logo routes, one refined', 'Colour, type and a 16-page guide', 'Rollout option adds: signage, stationery, website templates and a vehicle wrap')}` },
  ], approvals: [[1, 10]] },
  { n: 16, client: 14, title: "Mother's Day campaign", deposit: '50', revisions: [{ at: 0.15, by: 'member', one: ['In-store', '1450.00'], two: ['In-store and social', '2300.00'], scope: `A Mother's Day campaign for both Wattle & Co. shops.\n\n${lines('Window graphics and A-frame posters', 'Gift card design', 'Social option adds: a styled flat-lay shoot and 10 posts')}` }] },
  { n: 17, client: 13, title: 'School fete posters and banners', deposit: '25', revisions: [{ at: 0.6, by: 'agent', one: ['Posters', '520.00'], two: ['Posters and banners', '980.00'], scope: `Promotion for the Fernhill spring fete.\n\n${lines('Poster design, A3 and A4', '150 printed posters', 'Banner option adds: two 3m vinyl banners for the school fence')}` }] },
  { n: 18, client: 10, title: 'Spring range social content', deposit: '30', revisions: [{ at: 1.5, by: 'agent', one: ['Monthly content', '1800.00'], two: ['Monthly content and reels', '2900.00'], scope: `A month of social content for the spring range.\n\n${lines('12 posts with copy, scheduled', 'One half-day content shoot', 'Reels option adds: four 20-second reels')}` }] },
]
