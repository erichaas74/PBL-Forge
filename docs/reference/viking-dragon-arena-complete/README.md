# Viking Dragon Arena — Complete Visual Pack

This pack keeps the existing battle physics, genetics gating, controls, HUD data,
and arena lifecycle. It replaces/extends only the visual environment.

## Main 3D renderer replacement
`assembly-arena-renderer.service.ts`

New dragon-only 3D scenery:
- circular sand fighting floor
- weathered stone pit ring
- carved/runic center mark
- existing timber palisade retained
- expanded shield decoration
- tiered Viking grandstands
- north/south timber gates with horn details and iron bars
- four lookout towers
- hanging clan banners
- carved dragon-training totems
- six flickering braziers
- existing chain dome and sea-stack horizon retained

All of the new arena set dressing is gated through the existing dragon setup check,
so car/robot/other assembly arena scenarios keep their normal environment.

## Viewport visual shell
- `arena-viewport.component.html`
- `arena-viewport.component.css`
- `arena-viewport.component.ts` (logic unchanged)

## Outer arena UI
When present:
- `dragon-arena.component.html`
- `dragon-arena.component.scss`

## Validation
The modified renderer passed a TypeScript transpile/syntax check.
A full Angular project build was not run in this isolated environment.
