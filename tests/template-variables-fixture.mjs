export const templateClients = [
 { name: 'Synthetic source agency', email: ['synthetic-platter-401', 'example.test'].join('@'), variableFields: { contactName: 'Sage Source', address: '41 Source Street', custom: { Region: 'SourceOnly', Service: 'Source service', Rate: '97.00' } } },
 { name: 'Synthetic West studio', email: ['synthetic-platter-402', 'example.test'].join('@'), variableFields: { contactName: 'Wren West', address: '42 West Street', custom: { Region: 'West', Service: 'West service', Rate: '125.00' } } },
 { name: 'Synthetic East studio', email: ['synthetic-platter-403', 'example.test'].join('@'), variableFields: { contactName: 'Eden East', address: '43 East Street', custom: { Region: 'East', Service: 'East service', Rate: '240.00' } } },
]

export const variableTemplateFields = clientId => ({
 clientId, title: 'Campaign for {{Client.Company}}',
 scope: '{{Contact.Name}} at {{Client.Address}}; region {{Custom.Region}}.',
 terms: 'Prepared by {{Sender.Name}}.', depositPercent: 30,
 optionOne: 'Essential campaign', priceOne: '1', optionTwo: 'Complete campaign', priceTwo: '1',
 pricingTables: [
  { optionId: 'one', name: 'Campaign services', lines: [{ name: '{{Custom.Service}}', description: 'Delivery for {{Client.Company}} by {{Sender.FirstName}}', quantity: '2', unit: 'project', unitPrice: '{{Custom.Rate}}' }] },
  { optionId: 'two', name: 'Extended services', lines: [{ name: '{{Custom.Service}}', description: 'Extended work for {{Client.Company}}', quantity: '3', unit: 'project', unitPrice: '{{Custom.Rate}}' }] },
 ],
 document: { version: 1, blocks: [{ id: 'synthetic-platter-template-text', type: 'text', title: 'Delivery team', text: '{{Client.Company}} works with {{Sender.Name}} in {{Custom.Region}}.' }] },
 variableValues: {},
})

// Independently expected destination results, including extended integer cents.
export const templateExpected = [
 { title: 'Campaign for Synthetic West studio', scope: 'Wren West at 42 West Street; region West.', line: 'West service', description: 'Delivery for Synthetic West studio by Jordan', prices: [25000, 37500] },
 { title: 'Campaign for Synthetic East studio', scope: 'Eden East at 43 East Street; region East.', line: 'East service', description: 'Delivery for Synthetic East studio by Jordan', prices: [48000, 72000] },
]
