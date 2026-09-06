# Assets

## Current state: placeholders

Every image slot in the UI renders `<PlaceholderImage>` (`src/components/ui/PlaceholderImage.tsx`)
— a labelled, tinted box with the correct aspect ratio. No real photography or
product renders are committed yet.

## Why

The only source material available is `iamgenes de la pagina/` — **70 raw photos,
~921 MB** (git-ignored). These are campaign / editorial shots at full resolution;
they are **not** web-optimised and do **not** include the flat product renders
(garment on black) used in the product cards.

## To wire in real assets (future PR)

1. Pick the shots that match each section of the reference screenshots.
2. Optimise: resize to sensible widths, convert to WebP/AVIF, target < 300 KB each.
3. Drop them in `public/images/` and swap `<PlaceholderImage>` for `next/image`.
4. Obtain the real **product renders** and the two **logo assets**
   (red graffiti "DEPT", black script "Dept") from the brand owner.
5. Replace the sampled color tokens in `globals.css` with the official brand codes.

## Fonts (stand-ins)

| Role | Screenshot | Stand-in (next/font/google) |
| --- | --- | --- |
| Display headings, nav, buttons, product names | condensed heavy uppercase | **Anton** / **Oswald** |
| Narrative body copy | regular humanist sans | **Inter** |
| Logo wordmark | decorative script | **Pinyon Script** (placeholder only) |
