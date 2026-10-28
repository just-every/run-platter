# Move in business records

Bring an existing client list into Platter with a reviewed CSV import. Open
**Import** in your installed app as the owner.

## Exported documents and report CSVs (`MIG-007`)

Use **Move in exported documents** on Import. Name a move-in, then add PDF files,
bulk ZIP downloads and report CSVs to it. You can return after signing in again:
select an interrupted file and **Upload or resume files** continues from its
saved byte offset. Repeated uploads of the same bytes are reused. Files are
limited to 5 MiB each and 20 MiB per move-in; ZIPs retain their original paths as
source evidence and allow up to 600 entries with 20 MiB expanded in total.

Report CSVs use **Title, Client, Date** columns, with dates in YYYY-MM-DD form.
The equivalent Document name, Client name and Created date headers are accepted.
All additional columns, such as status and value, remain source metadata.
PDF titles use their recorded title or filename. Recorded client and date
metadata narrow matches when present. Ambiguous rows need an explicit PDF choice
or **Leave this row unmapped**, followed by **Review report matches**.

The preview reports arrived agreements, items held for review, unmapped items
and duplicate PDFs. Certificate and signature-page text is recorded with its
source page; this recognition does not validate a signature. Completed files
are retained as read-only agreements. PDFs without that evidence remain
read-only open documents held for review. Every original download is
byte-identical, with its SHA-256 available under source evidence.

**Apply reviewed document move-in** binds all uploaded bytes and report choices.
Adding a file or changing a choice needs a fresh preview. After apply, the
move-in is frozen; use another move-in for more files. A later import holds
already retained documents rather than replacing them. The journal retains
original ZIPs, PDFs, report files, reviewed choices and each native change.
**Undo document move-in** removes unchanged imported documents and refuses while
a dependent proposal uses an original. Completed imports, exact originals,
reports, journals and working undo survive RER archives; staged upload transport
is local and is not restored.

This slice creates no client invitations, editable templates, native folders,
catalog items, contacts, payments or provider actions. Open-document reissue,
combined template and library conversion, catalog and contact integration,
provider enrichment and qualification of every incumbent's exports remain
unfinished. CSV image handling keeps the existing explicit failure and owner
choice to apply without images.

## Companies, contacts and catalog (`MIG-006`)

Use **Move in companies, contacts and catalog** on Import. Choose the record
kind and layout, paste the original CSV, then preview. The preview lists native
record counts, retained images, original field mappings and every diagnostic.
**Apply reviewed business import** binds the exact CSV, mapping, company
associations and acquired image bytes. Continue in bounded passes until complete.
The history opens the journal and downloads exact original files; undo removes
only unchanged records and refuses dependent contacts. RER archives preserve the
records, original CSV/mapping/image bytes, journals and undo custody.

Companies, contacts and catalog items are separate native records. Company links
use explicit source IDs or your reviewed exact label-to-ID associations. IDs and
exact email conflicts are held for review, never merged by names or email.
Exports with no IDs receive IDs scoped to the exact original file and row;
changing that file creates new source identities. Prices, ranges, percentages,
recurrence, tax flags, category paths, bundles and custom fields are imported
metadata for review. They never calculate a charge, convert currency or certify
an exemption. `CAT-001`, `PRICE-001`, `PRICE-003` and the full incumbent importers
inherit these exact values when their capabilities ship.

Platter contacts use these headers:

```csv
company_id,company_name,contact_id,first_name,last_name,email,title,phone,billing_address,service_address,tax_exempt
acme,Acme,contact-1,Dana,Chen,dana@acme.example,CFO,+1 212 555 0101,12 Market St,40 Studio Rd,yes
```

Catalog CSV requires `id,name`; optional columns include `sku,price,currency,
description,images,type,bundle_components,category,cost,billing_frequency,
quantity,unit_name,price_type,billing_mode,min_price,max_price,terms,tax_exempt,
optional,adjustable,tags`. All additional columns stay in `source_fields` with
warnings. The business importer accepts up to 1,000 rows and 2,000,000 UTF-8 bytes
per CSV. See the 200-contact and 50-item examples in `fixtures/business/`.

Presets read the published PandaDoc catalog and semicolon-delimited contact
layouts, Better Proposals products, Proposify fees, Qwilr saved quote lines and
Ignition services. Published import layouts are not claimed to be every version
of a vendor's export. For any differing support-provided contact or catalog
export, keep the file unchanged and choose **Reviewed column mapping**, for
example:

```json
{"delimiter":";","columns":{"contact_id":"Contact ID","first_name":"First Name","email":"Email","company_name":"Company"},"companyIds":{"Acme":"acme-source-id"}}
```

PandaDoc `Name,SKU,Type,SKUs_in_bundle,Category,Price,Cost,Currency,Description,
Images,Billing_frequency` and arbitrary custom columns remain lossless. Prices
and costs retain up to five decimal places exactly, including non-USD values;
bundles resolve explicit SKU/quantity references in the source. Descriptions are
retained as text, not executed HTML.

Image URLs use credential-free HTTPS with no redirects. The server validates
public DNS answers, connects only to a validated literal IP (no second hostname
resolution), and verifies TLS for the original hostname. It accepts PNG, JPEG,
GIF and WebP byte types, at most 5 MiB each and 20 MiB per import. An unfetched
image blocks apply and its URL remains visible. The owner may explicitly confirm
**Review import without unfetched images** for that exact file; those URLs stay
marked `not-fetched`, and the confirmation is bound into the reviewed fingerprint.
A runtime without hostname-verified TLS never bypasses validation or claims a
fetch. The checked pinned workerd accepts a correct public hostname and refuses
a mismatching hostname; no hosted provider account test is claimed.

Layout references: [PandaDoc catalog](https://support.pandadoc.com/en/articles/9714700-import-and-export-your-catalog-via-csv),
[PandaDoc contacts](https://support.pandadoc.com/en/articles/9715026-add-and-manage-your-contacts),
[Better Proposals products](https://help.betterproposals.io/en/articles/10031079-import-or-update-your-product-services),
[Proposify fees](https://legacy-support.proposify.com/hc/en-us/articles/4845995797019-Add-Fees-to-the-Pricing-Library),
[Qwilr lines](https://help.qwilr.com/article/216-importing-line-items),
[Ignition services](https://support.ignitionapp.com/en/articles/734852-importing-and-updating-services-in-bulk-using-a-csv-file).

The public command API uses `business-import.preview` / `business-import.apply`
with `{kind,format,csv,mapping?,omitUnfetchedImages?,fingerprint?}` and
`business-import.journal` / `business-import.undo` with `{id}`. All require the
current active owner, the importing owner's job identity and normal Origin
checks. `/api/platter/business-records` reads all native records for that owner;
`/api/platter/business-original?job=ID&name=NAME` downloads an original from its
owner-scoped journal.

## Original client CSV kit

The original client kit and its old journals remain available below the new
business importer, with their existing fingerprint and undo behavior.

## Preview and apply

1. Prepare a file in the format below, or start with the
   [sample client CSV](../fixtures/clients.csv).
2. Paste its contents into **CSV content** and choose **Preview import**.
3. Check the reviewed clients, counts, review notes and conflicts. Preview
   writes no client records. Correct any problems and preview again.
4. Choose **Apply reviewed import** to apply the exact CSV you reviewed.
5. Read **Import result** and **Import history**. If an import needs more work,
   choose **Resume reviewed import** until it completes.

Use **View journal** to read the import status and row history, download the exact original CSV, and inspect the changes
made by an import. If you change the CSV after previewing it, preview the new
contents before applying them.

## Undo an unused import

In **Import history**, choose **Undo import**. If it runs in passes, choose
**Continue undo** until it completes. Undo removes only unchanged clients
created by that import; later changes or dependent proposals block removal.
Clients already undone in earlier passes stay removed if another record
blocks the rest.

For a client added directly in **Clients**, **Erase unused client** requires
typing its exact name. Only clients without proposal or import history can be
erased this way. Undo an unused import to remove its clients. Accepted
agreements remain retained business records.

## CSV format

Platter's first move-in kit imports clients. An active owner can preview a CSV,
apply that exact reviewed file, inspect its journal, and undo it.

Use UTF-8 CSV with these exact headers, in order:

```csv
client_id,name,email
client_001,Avery Morgan,avery@example.com
client_002,"River & Pine, Studio",hello@riverpine.example
```

The fixture is `fixtures/clients.csv`. IDs use 1–100 letters, digits, underscores
or hyphens. Names must be nonempty and at most 200 characters; emails must be
valid and at most 254 characters. Values are trimmed and emails lowercased.
Quoted commas, quotes, and newlines are supported. Each import holds 1–100
clients and at most 100,000 UTF-8 bytes. Duplicate IDs or emails within a file
are rejected with the physical line number. Existing client IDs or emails are
reported in preview and rejected on apply; client records are never overwritten.

Preview writes nothing. Apply requires the fingerprint returned by preview and
the exact same CSV bytes. Any changed file needs a fresh preview. Each atomic
batch rechecks the active owner's authority and native records. Repeating apply
with the same CSV and fingerprint resumes its journal without duplicate clients.
If the job is `applying`, repeat apply until it is `completed`.

The owner can download the original client CSV from the journal. The download requires an active owner session, just like the journal itself.

The journal retains exact original CSV bytes, source identities, native record
provenance, and applied/undone batch positions. Undo removes only unchanged
clients written by that job. Later edits, including edits without a version
bump, cause a conflict. Proposals referencing a client prevent deletion through
the native foreign key. Undo may complete in passes; repeat the same undo when
its job is `undoing`. If a later edit blocks undo, resolve that conflict before
continuing; records already undone in earlier passes remain removed.

## Server API

`src/platter/movein/index.ts` exports `importCommand(db, who, name, input)` and
`importJobs(db, who)`. Both require a native authenticated actor with role
`owner` and a current active owner row in `oa_operators`. Individual jobs belong
to their importing owner. The HTTP layer must authenticate requests and enforce
its existing request-origin checks.

| Command | Input | Result |
| --- | --- | --- |
| `import.preview` | `{csv}` | `{kit, fingerprint, counts, diagnostics, clients, conflicts, canApply}` |
| `import.apply` | `{csv, fingerprint}` | `{job, fingerprint}` |
| `import.journal` | `{id}` | `{job, originals, batches, provenance}` |
| `import.undo` | `{id}` | `{job}` |

`importJobs` returns the newest 30 owner-scoped summaries with `id`, `state`,
`checkpoint`, `total`, `fingerprint`, and `error`. Validation errors have HTTP
status 400, authorization failures 403, missing journals 404, and conflicts 409;
the error includes `code` and a human-readable `message`.

## Integration

Apply `src/platter/movein/schema.sql` as an additive migration after `p_clients`.
It installs Base's import-kit D1 schema and `p_import_client_revisions`, which
stores the import revision alongside the real `p_clients` row. Keep
`p_proposals.client_id REFERENCES p_clients(id) ON DELETE RESTRICT`. The Worker
needs `nodejs_compat`, as required by Base's kit. The copied kit and D1 transport
come from the supplied Base source; the adapter follows supplied Run Glove and
Run Lanyard integrations. This is an authored CSV interface, not a vendor export
format or an account-tested vendor connector.
