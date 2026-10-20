// One October, Sat Oct 3 – Fri Oct 30, 2026: the records every section shares (evidence/desk-platter/page-s1,
// STRUCTURE.md "Records"). A figure that appears in more than one section is read from here.

export type FirmId = 'fernhill' | 'magnolia' | 'evergreen' | 'northlight' | 'brightwire' | 'junepark'

export const firms: Record<FirmId, { name: string; place: string; mark: string }> = {
  fernhill: { name: 'Fernhill Design Studio', place: 'Austin, TX', mark: 'Fernhill’s sprig' },
  magnolia: { name: 'Magnolia & Thyme Catering', place: 'Wilmington, DE', mark: 'Magnolia & Thyme’s flower' },
  evergreen: { name: 'Evergreen Digital', place: 'Dallas, TX', mark: 'Evergreen’s tree' },
  northlight: { name: 'Northlight Video', place: 'Denver, CO', mark: 'Northlight’s camera' },
  brightwire: { name: 'Brightwire IT', place: 'Manchester, NH', mark: 'Brightwire’s server' },
  junepark: { name: 'June Park Photography', place: 'Portland, OR', mark: 'June Park’s tree' },
}

// P1 Fernhill → Bluebonnet Café (rev 2): only the menu boards are taxed.
export const p1 = {
  better: '$6,500.00', boards: '$1,200.00', board: '$600.00', tax: '$99.00', total: '$7,799.00', deposit: '$3,899.50',
  rev1Tax: '$49.50', rev1Total: '$7,149.50', rev1Deposit: '$3,574.75',
  fee: '$5.00', payout: '$3,894.50', invoice: '2041', account: '••2207',
}
// P2 Magnolia & Thyme → Raman–Whitley wedding
export const p2 = { guests: 140, perGuest: '$68.00', total: '$9,520.00', deposit: '$2,856.00', balance: '$6,664.00', sent120: '$8,160.00', deposit120: '$2,448.00' }
// P3 Evergreen → Honeysuckle Café, P4 Evergreen → Northpoint Property Mgmt
export const p3 = { retainer: '$650.00' }
export const p4 = { setup: '$2,500.00', monthly: '$1,200.00', firstYear: '$16,900.00' }
// Sample mailboxes on reserved example domains (RFC 2606): the bounce goes to the old domain, the resend to the right one.
export const mail = { bounced: 'tom@northpoint.example', tom: 'tom@northpointpm.example', alicia: 'alicia@evergreendigital.example' }
// P5 Northlight → Sweet Ridge Bakery
export const p5 = { shoot: '$3,200.00', edit: '$450.00', total: '$4,550.00', deposit: '$2,275.00' }
// P6 Brightwire → Lakeside Dental
export const p6 = { draft: '$5,400.00', priced: '$6,000.00', deposit: '$1,800.00', invoice: '1187', card: '••4410' }
// P7 June Park → Novak–Diaz wedding
export const p7 = { rev1: '$4,200.00', drone: '$450.00', total: '$4,650.00', retainer: '$1,000.00' }
