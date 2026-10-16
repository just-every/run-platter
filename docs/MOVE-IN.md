# Move in your clients

Bring an existing client list into Platter with a reviewed CSV import. Open
**Import** in your installed app as the owner.

## Preview and apply

1. Prepare a file in the format below, or start with the
   [sample client CSV](../fixtures/clients.csv).
2. Paste its contents into **CSV content** and choose **Preview import**.
3. Check the reviewed clients, counts, review notes and conflicts. Preview
   writes no client records. Correct any problems and preview again.
4. Choose **Apply reviewed import** to apply the exact CSV you reviewed.
5. Read **Import result** and **Import history**. If an import needs more work,
   choose **Resume reviewed import** until it completes.

Use **View journal** to inspect the retained original data and the changes
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
