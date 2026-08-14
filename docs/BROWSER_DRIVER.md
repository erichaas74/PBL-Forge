# Browser driver

`scripts/browser.mjs` drives the app in a real Chromium from the command line: navigate, click,
drag, set a slider, read the DOM, screenshot.

It is a plain CLI on purpose. No editor integration, no MCP server, no per-assistant setup — any
agent that can run a shell command can use it, and so can a person.

```powershell
npm install --no-save playwright   # once, if it is missing
npx playwright install chromium
```

## The loop

```powershell
node scripts/browser.mjs --serve=designer snap-workshop "wait .shop__stage" "sleep 2000" "shot it"
```

Then **open `.browse/it.png`**. That is the point: an assistant can read the PNG back and see what
the change actually did, instead of reasoning about CSS.

`.browse/` is gitignored — working images, not assets.

## Arguments

The first positional is a URL or a path. Everything after it is a step, one quoted string each,
run in order.

> **Write paths without a leading slash** (`snap-workshop`, not `/snap-workshop`). Git Bash on
> Windows rewrites a leading `/` into `C:/Program Files/Git/...`. The script undoes that when it
> can, but not feeding it the problem is better.

### Steps

| Step | What it does |
| --- | --- |
| `wait <selector>` | wait for it to be visible |
| `waittext <text…>` | wait for the text to appear |
| `sleep <ms>` | let an animation or a render loop settle |
| `click <target>` | click — see targets below |
| `dblclick <target>` / `hover <target>` | as named |
| `drag <target> <target>` | press, move in 24 steps, release — real pointer events |
| `type <selector> <text…>` | fill a text input |
| `set <selector> <value>` | set a value and fire `input`/`change` |
| `press <key>` / `press <sel> <key>` | keyboard |
| `scroll <selector> <dy>` | wheel over an element |
| `shot [name] [selector]` | screenshot the page, or one element |
| `text <selector>` / `count <selector>` | print text / how many match |
| `eval <js…>` | evaluate in the page, print the result as JSON |
| `assert <js…>` | fail the run if falsy |
| `goto <url>` | navigate again |

Use `set`, not `type`, for range inputs, number inputs, and selects. `fill()` cannot drive a range
input at all, and assigning `.value` from a script fires no event, so Angular never sees it. `set`
writes through the native setter and dispatches `input` and `change`.

### Targets

| Form | Means |
| --- | --- |
| `.selector` | the element's centre |
| `.selector@120,80` | 120px right, 80px down from its top-left |
| `.selector@50%,50%` | the same, as a fraction of its box |
| `@700,260` | reuses the previous target's element |

Element-relative pixels are what make a canvas workable: screenshot it, look at the image, read off
the coordinates, drag from there.

### Flags

| Flag | Default | Notes |
| --- | --- | --- |
| `--serve=designer\|app` | — | start the dev server first and stop it after; reuses one already running |
| `--headed` | off | show the browser |
| `--slow=250` | 0 | slow each interaction down, to watch it |
| `--viewport=1600x1000` | 1600x1000 | |
| `--scale=2` | 2 | device pixel ratio for screenshots |
| `--out=.browse` | `.browse` | |
| `--timeout=15000` | 15000 | per step |
| `--until=load\|networkidle` | `domcontentloaded` | navigation wait |
| `--reduced-motion` | off | emulate `prefers-reduced-motion: reduce` |
| `--allow-errors` | off | do not fail on console errors |
| `--keep-open` | off | with `--headed`, wait for Enter before closing |

## What it fails on

Non-zero exit if a step throws, an assert is falsy, the page throws, or anything reaches the console
error channel — a silent console error being exactly what a screenshot will not show you. Firebase
connection noise is filtered, because the emulator is usually not running. On a failed step it saves
`.browse/failure.png` before it exits.

`--until=networkidle` will hang the main app: Firestore holds a long-poll open, so the network never
goes idle. The default `domcontentloaded` plus an explicit `wait` is the right pattern.

**Screenshotting one element on a page with a dragon on it needs `--reduced-motion`.** The specimen
viewers run a permanent idle loop — the dragon breathes — and an element screenshot waits for its
target to settle, so `shot name .viewport__stage` times out without it. A whole-page `shot name`
is unaffected. The flag turns the loop off at its source rather than papering over it, so what you
capture is a real state the app renders for a student who asked for less motion.

## Worked example

Checking that dragging a socket marker in the Snap Workshop moves it and updates the readouts:

```powershell
node scripts/browser.mjs --serve=designer snap-workshop `
  "wait .shop__stage" "sleep 2500" `
  "eval [...document.querySelectorAll('.socket-editor__exact input')].map(i=>i.value)" `
  "drag .shop__stage@614,441 @734,381" "sleep 400" `
  "eval [...document.querySelectorAll('.socket-editor__exact input')].map(i=>i.value)" `
  "count .socket-list__badge" "shot dragged"
```

```text
  → eval …  ·  ["1.286","0.056","0"]
  → drag .shop__stage@614,441 @734,381  ·  854,570 → 974,510
  → eval …  ·  ["1.941","0.528","-0.808"]
  → count .socket-list__badge  ·  1
```

## Related

- `npm run bake:parts` — the narrower, older loop: bakes part renders from `/parts-lab` to PNGs.
  Still the right tool for judging mesh quality across six angles.
