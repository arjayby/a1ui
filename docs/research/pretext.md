# Pretext component ideas

Checked September 6, 2026. Assumes the intended library is [`@chenglou/pretext`](https://github.com/chenglou/pretext).

Pretext measures and lays out multiline text in JavaScript/TypeScript. `prepare()` caches segmentation and canvas measurements; `layout()` calculates height and line count from those measurements. Reuse preparation across width changes. `layoutWithLines()` returns line text, while `measureLineStats()` reports the widest wrapped line. `layoutNextLineRange()` accepts a new width for each line, supporting custom flow around obstacles. React would own the component and rendering. [Official API](https://github.com/chenglou/pretext/blob/main/README.md)

Proposed components, ordered by fit for this gallery:

| Idea | Visible interaction | Pretext's role |
| --- | --- | --- |
| Shape Flow | Drag a circle or image through a paragraph; text wraps around it live. | Lay out each line against the space remaining beside the shape. |
| Editorial Card | Resize a magazine card; headline and body flow around a portrait or pull quote. | Compute line placement and continue text between columns. |
| Fitted Chat Bubble | Edit messages or resize the panel; bubbles tighten around their longest line. | Calculate wrapped line widths and compare candidate bubble widths. |
| Quote Frame | Resize a quote card; the text keeps deliberate breaks and balanced whitespace. | Evaluate widths and line counts before rendering the chosen arrangement. |
| Text Masonry | Change card width or content; testimonials settle into correctly sized columns. | Predict each paragraph's height before placing the card. |

These are component proposals. The official gallery already demonstrates obstacle-aware editorial layouts, tight bubbles, rich inline text, and text-card masonry. [Official demos](https://chenglou.me/pretext/)

Shape Flow is the strongest first addition beside this gallery's existing animated text components. The upstream dynamic-layout example calculates obstacle contours, checks each complete line band, and continues one text stream between columns. The application must supply geometry and motion; Pretext supplies the line breaking. [Example source](https://github.com/chenglou/pretext/blob/main/pages/demos/dynamic-layout.ts)

Implementation constraints: use a named font and match its font settings, letter spacing, and line height to rendered CSS. Runtime requires Canvas 2D and `Intl.Segmenter`. The README still describes server rendering as forthcoming. Custom bidi metadata is approximate; it is not a full glyph-position engine. Automatic hyphenation is absent. The optional rich-inline helper handles inline fragments and atomic chips, not arbitrary nested HTML. [Supported behavior and caveats](https://github.com/chenglou/pretext/blob/main/README.md#caveats)
