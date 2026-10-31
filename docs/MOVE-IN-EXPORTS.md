# Qwilr PDF and Ignition export review

The owner can choose Qwilr PDF exports or Ignition exports when starting a document move-in on the Import page. Upload the original PDFs and CSVs, individually or inside ZIP files. Interrupted uploads resume from their saved byte offset. Previewing writes no imported records.

For Ignition, name the supplied CSV files `clients.csv`, `services.csv`, `proposals.csv` and `billing-schedules.csv`. For Qwilr, PDFs work without a source index; an optional supplied `proposals.csv` can associate source page IDs, dates, values and currencies. Export versions differ: the displayed column mappings are starting choices, not a claim that every incumbent version has the same headers. Review or replace each mapping with the exact headers in the supplied files. Originals and additional columns remain retained even when they are not mapped.

The default Ignition mappings use these columns:

- Clients: Client ID, Client Name.
- Services: #ID, Service Name, Service Description, Price, Currency.
- Proposals: Proposal ID, Proposal Name, Client ID, Created Date, Status, Currency, Value, PDF.
- Billing schedules: Billing Schedule ID, Proposal ID, Service ID, Status, Start Date, Currency, Amount, Frequency.

The optional Qwilr index uses Page ID, Title, Client, Date, Status, Currency, Value and PDF. The PDF column names the supplied original. Missing or ambiguous bindings hold application until the owner selects an offered source record or explicitly retains that fact without a binding. Separate source IDs never merge merely because names match.

Review and apply bind the exact uploaded bytes, mappings and binding choices. Changing any of them requires another preview. Application resumes through the journal; replay cannot replace an existing original or source record. Undo preserves later edits and records with dependent proposals.

Ignition clients become imported company metadata. Services become catalog reference metadata with exact decimal strings and currencies, without executable prices. Proposals and billing schedules remain source facts. An active source billing schedule is explicitly non-executable evidence: importing, restoring or advancing the clock creates no invoice, subscription, charge, invitation or provider request. PDFs stay fixed and read-only; a source signature page is retained evidence, not cryptographic validation. Open proposals remain held read-only.

API imports, editable reconstruction, template and library adoption, pricing promotion within this move-in, reissue, subscription adoption, billing continuation, recipient roles, delegation and complete provider qualification remain outside this exported-file slice. Archive restoration retains the originals, hashes, mappings, source facts and journal with working undo; it conveys no provider credentials or billing authority.

Apply `migrations/core/0100_qwilr_ignition_exports.sql` after `0099_proposify_exports.sql` before using this review. It adds move-in source/mapping fields and retained source-fact/dependency tables without granting execution authority.
