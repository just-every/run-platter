# Fonts

Every face is self-hosted under the SIL Open Font License 1.1; each folder carries its `OFL.txt`. The Latin WOFF2
files come from Fontsource's distributions, version 5.3.x. `../rer-theme.css` declares each face once, beside the
`--rer-*` theme tokens, so the installer serves them too; `fonts.css` holds Platter's own tokens and the rules for
Base's pages.

- `rethink-sans/`: Rethink Sans, variable 400–800 (the app's interface face). Upstream: https://github.com/hans-thiessen/Rethink-Sans.
- `source-serif-4/`: Source Serif 4, variable weight and optical size (the site's headings and card titles). Upstream: https://github.com/adobe-fonts/source-serif.
- `inter/`: Inter, variable weight (the site's text, with tabular figures). Upstream: https://github.com/rsms/inter.
- `kalam/`: Kalam 400 and 700 (the site's handwritten notes). Upstream: https://github.com/itfoundry/kalam.
- `great-vibes/`: Great Vibes (typed signatures on the site's certificate drawing). Upstream: https://github.com/googlefonts/great-vibes.

`pdf/inter.ttf` and `pdf/source-serif-4.ttf` are static regular-weight instances of the corresponding WOFF2 files above (Source Serif optical size 20). They use the same SIL Open Font License in each source folder, and keep branded PDFs independent of runtime WOFF2 decoding.
