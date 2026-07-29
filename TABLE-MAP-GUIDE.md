# Table Booking — Floor Map & Interactive Guide (dev reference)

> Everything about the table-booking floor map and its first-run **interactive
> walkthrough**. Read this before touching `FloorMap.tsx` / `MapGuide.tsx`.
> Companion to `AGENTS.md` (overall architecture) and `CONTEXT.md` (status/log).

## 1. Where it lives

| File | Role |
|---|---|
| `src/components/table/TableBooking.tsx` | Page controller: date → slots → **layout fetch + live polling** → renders `FloorMap`, booking sheet, success. Owns the real `selected` tables. |
| `src/components/table/FloorMap.tsx` | The interactive map: pan/zoom, zone/table pins, zone-outline colours, and it **hosts** the guide. Exposes the guide "driver". |
| `src/components/table/MapGuide.tsx` | The **scripted interactive tour** overlay (steps + animated hand). Exports the `GuideDriver` type. |
| `src/lib/tableApi.ts` | `getTableSlots` / `getTableLayouts` (public, **uncached** `no-store`), init/confirm/mine. |
| `src/app/globals.css` | `.zone-focus` (white marching-ants outline), `.guide-tap` (hand tap keyframe). |

Route: `/event/table?event={eventId}` (from "Book a Table" on an event when
`event.tableBookingEnabled`).

## 2. FloorMap — how the map itself works

- Data: a `TableLayout` = `sceneimageurl` (the plan image) + `areas[]` (zones).
  Each zone/table has a **normalized 0–1 `hotspot`** and zones have an
  `outlinePolygon` + `focusBounds`. Pin colour comes from `pinColor`
  (`green`=available, `red`=sold out, `yellow`=unavailable, `blue`).
- Interaction: **drag = pan, pinch/scroll = zoom** (imperative transform on a
  layer div; `natSize` is the image's natural px mirrored into state to satisfy
  the "no ref reads during render" rule).
- Overview shows **one dot per zone**; tap a zone (dot or polygon) → **smooth
  zoom in** to its tables; tap another zone → pans there; tap empty floor →
  zoom out; the **← Overview** button always zooms out.
- **Zone outline colour priority:** green (has your pick) → red (sold out) →
  yellow (all unavailable) → animated white (currently viewing) → faint (idle).
- **Multi-table = one zone only.** Once a table is picked, other zones' pins
  disable/dim (`activeZoneId`).
- Each table/zone pin button carries **`data-spot-id={spot._id}`** — this is how
  the guide's hand finds the real on-screen pin.

## 3. Real-time updates (polling)

Both the event ticket page and this map **short-poll** (see also `AGENTS.md`).
For the map, in `TableBooking.tsx`:

- Every **5 seconds** it re-fetches `getTableLayouts(...)` and calls `setLayout`.
- Fetches are **uncached** (`cache: "no-store"` in `tableApi.publicGet`).
- **De-duped:** `layoutSig()` compares availability-driving fields; state only
  updates (→ re-render) when something actually changed, so the map stays smooth.
- **Paused** when: the tab is hidden, the booking sheet is open, during
  pay/confirm/done, **and while the guide tour is running** (`guideActive`).
- On each refresh it **reconciles the selection**: a picked table that is no
  longer `green`/selectable is dropped; kept tables get refreshed data.

So pins and zone outlines recolour live (green → red/yellow) without a refresh.

## 4. The interactive guide

Replaces the old static hand-pointer (fixed %, not responsive). Now the tour
**drives the real map** and an animated hand **taps the real pins**.

### 4a. Trigger & lifecycle
- Auto-opens **once per browser** on first visit (`localStorage` key
  `bhk:map-guide-seen`), ~700ms after the plan image decodes.
- Re-openable anytime via the **`?`** button in the map controls.
- While open, `FloorMap` calls `onGuideActive(true)` → `TableBooking` **pauses
  polling**. On close it clears demo state, returns to **Overview**, marks the
  guide seen, and resumes polling.

### 4b. The driver (FloorMap → MapGuide)
`FloorMap` builds a `GuideDriver` (typed in `MapGuide.tsx`) and passes it in.
It lets the guide move the map and **fake** visuals WITHOUT touching the real
booking:
```ts
interface GuideDriver {
  overview(): void;                       // = backToOverview()
  openZone(id): void;                     // = focusZone(zone)  (zoom in)
  select(id | null): void;                // demo ✓ highlight  (setDemoSelected)
  markUnavailable(id | null): void;       // demo red zone     (setDemoUnavail)
  demoZoneId / demoTableId / demoZone2Id; // real ids picked from the layout
}
```
- `demoZone` = first zone with a green table; `demoTableId` = a green table in it;
  `demoZone2` = a different zone (for the "turns red" demo).
- **Demo overrides are visual only:** in FloorMap, a pin is "selected" if
  `selectedSet.has(id) || demoSelected === id`; a zone renders red if
  `demoUnavail === z._id` (`demoRed`). They never call `onToggle`, so the real
  `selected`/quote is untouched.

### 4c. Steps (`STEPS` in `MapGuide.tsx`)
Each step = `{ title, body, run(driver), target?(driver) }`.
- `run` performs the real map action when the step becomes active.
- `target` returns a `data-spot-id` the animated hand should hover/tap.

Current script:
1. **Floor plan** — `overview()`, clears demos. (no hand target)
2. **Open a zone** — hand taps the zone dot (`target: demoZoneId`), then after a
   beat `openZone(demoZoneId)` zooms in.
3. **Pick a table** — ensures the zone is open, hand taps the table
   (`target: demoTableId`), then `select(demoTableId)` shows the ✓.
4. **Availability is live** — `overview()` then `markUnavailable(demoZone2Id)` so
   a zone outline flashes **red** (hand points at it). A colour legend is pinned
   top-centre.
5. **Zoom back out** — clears the red, `overview()`. Button reads "Start booking".

### 4d. The animated hand
- A single hand element (`handRef`) positioned by a **`requestAnimationFrame`
  loop**: it reads `document.querySelector([data-spot-id="…"])`, computes the
  pin's centre relative to the guide root, and sets `transform: translate(x,y)`
  every frame — so it **stays glued to the real pin while the map pans/zooms**.
- If the target isn't on screen (wrong zoom level), the hand fades out
  (`opacity 0`).
- Tap animation = `.guide-tap` keyframe (globals.css) + a pulsing ripple.
- A transparent full-map layer swallows stray taps so the user can't fight the
  tour; the bottom **card** (Back / Next / dots / Skip) is above it.

## 5. How to modify

- **Edit copy / steps:** change the `STEPS` array in `MapGuide.tsx`. Add a step
  with `run` (map action) and optional `target` (spot id for the hand).
- **Point the hand elsewhere:** return a different `data-spot-id` from `target`.
  Any pin renders that attribute already.
- **Change which zone/table the demo uses:** edit the `demoZone/demoTableId/
  demoZone2` selection in `FloorMap.tsx` (the `guideDriver` block).
- **Change poll interval:** `window.setInterval(poll, 5_000)` in
  `TableBooking.tsx` (and the ticket one in `TicketPurchase.tsx`).
- **Reset "seen" while testing:** clear `localStorage['bhk:map-guide-seen']`
  (or use the `?` button to replay).

## 6. Gotchas / invariants
- Demo overrides must stay **visual-only** — never route them through `onToggle`
  or the real `selected`.
- Keep **polling paused during the guide** (`guideActive`) so a live refresh
  can't overwrite the demo red zone mid-tour.
- The hand relies on `data-spot-id` on pins — don't remove it.
- Static export: all of this is **client-side**; no server rendering of live data.
