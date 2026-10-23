# Proposal PDF fonts

Noto Sans Regular, GNU Unifont 15.0.06 and Unifont Upper 15.0.06 are embedded as subsets in
proposal PDF downloads. They do not change the application or public site fonts.

Sources:
- https://github.com/notofonts/noto-fonts/blob/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf
- https://github.com/notofonts/noto-fonts/blob/main/LICENSE
- https://ftp.gnu.org/pub/gnu/unifont/unifont-15.0.06/unifont-15.0.06.ttf
- https://ftp.gnu.org/pub/gnu/unifont/unifont-15.0.06/unifont_upper-15.0.06.ttf
- https://unifoundry.com/LICENSE.txt

The font license and embedding exception are in LICENSE.txt.

Branded documents also use static regular-weight Inter and Source Serif 4 instances generated from the already shipped WOFF2 faces. Their SIL Open Font License files remain in `../inter/OFL.txt` and `../source-serif-4/OFL.txt`; the corresponding `inter.ttf` and `source-serif-4.ttf` files preserve the chosen web font in PDFs.
