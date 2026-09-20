# Assets

## Current state: lookbook photos wired, product renders still placeholders

`<PlaceholderImage>` (`src/components/ui/PlaceholderImage.tsx`) accepts an optional
`src`. With `src` it renders the photo through `next/image` (`object-cover`, `alt` =
`label`); without it, it falls back to the labelled, tinted stand-in box.

38 optimised lookbook photos live in `public/images/` (JPG, q76–80, ~200–600 KB each,
~12.5 MB total):

| Slot | File |
| --- | --- |
| Home – hero | `home-hero.jpg` |
| Home – new arrivals | `new-arrivals.jpg` |
| Home – split banner | `banner-women.jpg`, `banner-men.jpg` |
| Home – editorial block | `editorial.jpg` |
| `/collections/{all,men,women}` hero | `collection-{handle}.jpg` |
| Product cards (8) | `product-{handle}.jpg` (+ `-2`, `-3` = hover / PDP gallery) |
| Community gallery (10) | `community-01..10.jpg` |
| New arrivals background | `community-02.jpg` |

## Why they don't match the reference site

The source folder `iamgenes de la pagina/` (**70 raw photos, ~921 MB**, git-ignored)
is a *different photoshoot* from the one on daregulardept.com. It is a daytime
lookbook against a grey graffiti wall plus a few night group shots. It does **not**
contain the reference's cold-blue balaclava hero, the banknote-fan editorial shot,
the pink/multicolour graffiti banners, or the **flat product renders** (garment on
black) used in the product cards. The current picks are the closest fit by role.

## Still missing

1. The real **product renders** (flat, on black) — the cards currently show model shots.
2. The reference **hero** (two people in balaclavas, cold blue) and **editorial**
   (crouching person with banknotes, red sneakers) photos.
3. The two **logo** vectors (red graffiti "DEPT", black script "Dept").
4. The official **brand colour codes** — tokens in `globals.css` are sampled by eye.

## Adding / swapping a photo

1. Resize to ≤ 1500 px wide and export JPG/WebP/AVIF, target < 300 KB.
2. Drop it in `public/images/` using the naming above.
3. Pass it as `src` to the matching `<PlaceholderImage>`.

> `.gitignore` ignores the raw folders by directory. Don't re-add a global `*.JPG`
> rule: with `core.ignorecase=true` (Windows) it also ignores `public/images/*.jpg`.

## Fonts (stand-ins)

| Role | Screenshot | Stand-in (next/font/google) | Status |
| --- | --- | --- | --- |
| Display headings, nav, buttons, product names | condensed heavy uppercase | **Anton** / **Oswald** | ✓ Ready |
| Narrative body copy | regular humanist sans | **Inter** | ✓ Ready |
| Logo wordmark | decorative script | **Pinyon Script** (SVG text renderer) | ⏳ Stand-in; replace with red graffiti "DEPT" + black script "Dept" vectors |
