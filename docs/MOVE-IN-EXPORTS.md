# Qwilr PDF and Ignition export review

The owner can choose Qwilr PDF exports or Ignition exports when starting a document move-in on the Import page. Upload the original PDFs and CSVs, individually or inside ZIP files. Interrupted uploads resume from their saved byte offset. Previewing writes no imported records.

For Ignition, name the supplied CSV files `clients.csv`, `services.csv`, `proposals.csv` and `billing-schedules.csv`. For Qwilr, PDFs work without a source index; an optional supplied `proposals.csv` can associate source page IDs, dates, values and currencies. Export versions differ: the displayed column mappings are starting choices, not a claim that every incumbent version has the same headers. Review or replace each mapping with the exact headers in the supplied files. Originals and additional columns remain retained even when they are not mapped.

The default Ignition mappings use these columns:

- Clients: Client ID, Client Name.
- Services: #ID, Service Name, Service Description, Price, Currency. A reviewed mapping can additionally bind supplied SKU, unit_name, billing_frequency, price_type, billing_mode, min_price, max_price, cost, tax_code and income_account fields to their exact headers.
- Proposals: Proposal ID, Proposal Name, Client ID, Created Date, Status, Currency, Value, PDF.
- Billing schedules: Billing Schedule ID, Proposal ID, Service ID, Status, Start Date, Currency, Amount, Frequency.

The optional Qwilr index uses Page ID, Title, Client, Date, Status, Currency, Value and PDF. The PDF column names the supplied original. Missing or ambiguous bindings hold application until the owner selects an offered source record or explicitly retains that fact without a binding. Separate source IDs never merge merely because names match.

Review and apply bind the exact uploaded bytes, mappings and binding choices. Changing any of them requires another preview. Application resumes through the journal; replay cannot replace an existing original or source record. Undo preserves later edits and records with dependent proposals.

Ignition clients become imported company metadata. Services become catalog reference metadata with exact decimal strings and currencies. An owner can separately select mapped image-free fixed USD services in the existing priced catalog review. Promotion does not adopt the source billing schedule. A promoted price keeps its source records and journal alive: undo refuses while it depends on them. Proposals and billing schedules remain source facts. An active source billing schedule is explicitly non-executable evidence: importing, restoring or advancing the clock creates no invoice, subscription, charge, invitation or provider request. PDFs stay fixed and read-only; a source signature page is retained evidence, not cryptographic validation. Open proposals remain held read-only.

Full API migration, editable reconstruction, template and library adoption, unsupported executable pricing shapes, reissue, subscription adoption, billing continuation, recipient roles, delegation and complete provider qualification remain unfinished. Archive restoration retains the originals, hashes, mappings, source facts and journal with working undo; it conveys no provider credentials or billing authority.

## Optional Qwilr API evidence

In an unreviewed Qwilr move-in, open **Read Qwilr API evidence**, enter an API token and explicitly authorize the read. The token is transient and never retained. The reader traverses active and archived page lists with cursor pagination, fetches each page detail with acceptance and preview-acceptance expansions, and reads saved-block summaries. It rechecks the current active owner before and after every request. Refusals, redirects, unsupported responses and interrupted captures retain no partial API upload; explicitly reading again starts a new capture.

Every successful JSON response is retained byte-identical inside the captured ZIP and separately in the applied journal, with its SHA-256. Upload PDFs separately and review the source page bindings; a missing original needs an explicit decision to retain the source without a PDF. Quotes, source signers, schedules and source ownership are evidence only. They grant no signature, payment, membership or sending authority. Applying binds the captured bytes and choices; it does not synchronize with future Qwilr changes.

The [Qwilr API reference](https://docs.qwilr.com/api-reference/) and its [deployed schema](https://docs.qwilr.com/page-data/api-reference/page-data.json) supply page metadata and accepted quote facts, but no editable page or template body and no saved-block content. Missing bodies are reported for rebuilding, never invented. Returned PDF and audit download links stay as source evidence; they are not followed through the unqualified image-egress path. Full editable import and incumbent qualification remain held.
