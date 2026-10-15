# Source reuse

Generated from the committed Base foundation, then converted to the published RER package. Runtime dependency is pinned; no sibling runtime service or private checkout is required.

| Source | Revision read |
| --- | --- |
| base | `a06bd065124c2b45fa879e62736fb5e1987efdaa` |
| run-glove | `1b13d601922a3d9d0e0ddd149bef21f166862973` |
| run-inkwell | `6d9d212ae06ecccefd5a74bb94a3c16255cd7654` |
| run-orbit | `57e577bd6b7468c8715c4453055809533257cfee` |
| run-satchel | `db53e8067fca8a4378a62a0f5a96a19ee7e2f2ba` |
| run-barrow | `62dbc9560aaa54c71c55769335b9f7013d485e4c` |
| run-lanyard | `5316693371c149ffd3eb398a796ba66d83affa03` |

- Glove `src/glove/commands/quotes.ts`: exact revision approval and frozen accepted terms.
- Glove `src/glove/commands/invoices.ts`: Xero column layout and retained once-only export, adapted to deposits.
- Inkwell `src/inkwell/signing.ts`: scoped email-code verification, expiry, attempt limits and consent.
- Orbit `src/core/features/records/repository.ts`: normalized email identity and duplicate rejection.
- Lanyard: owner-bound revocable agent credentials, native HTTP integration and archive journey harness.
- Base `modules/import-kit` and `modules/d1-transport`: copied editable sources for Client CSV dry run, journal and undo; migration schema copied from the same revision.
- Satchel, Barrow and Lanyard mains: package-mode installer/runtime integration examples.

The interactive proposal page, deposit rules and schema are Platter-owned. Upstream MIT and font licences are retained.
