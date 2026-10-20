# columns-promo-panels

Custom **columns** block. Purpose: Two side-by-side promo panels, each with heading, optional subheading, text and CTA buttons; a panel may have a background image.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row; each cell is a panel: optional background image first, then H2, optional H3, paragraph(s), CTA link(s).

- **Bold** link = primary (green) button, _italic_ link = secondary (grey outline) button. Buttons stack full width.

## Panel colours (automatic, no option to set)

Panel colours follow the content, so authors never pick a colour:

| Panel | Colour |
| --- | --- |
| Cell that starts with an image | Navy panel; the image shows faintly behind white text; its primary button is white with green text |
| Light panel next to a navy (image) panel | Light grey (`--vh-grey-100`) |
| Two light panels (no image in either cell) | First panel white, second panel beige (`--vh-beige`) |

Every panel has a soft drop shadow so a white panel still stands out on a white page.

## Layout

- Mobile (< 900px): panels stack full-bleed, with 50px padding.
- Desktop (>= 900px): two equal panels in a 1200px container with a 30px gap. Content sits 75px from the edges, centred vertically, and both panels are the same height.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
