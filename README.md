# libCanary / CANARY MINE

Educational stack-canary playground.

## Play the 8-bit game

```bash
make game
```

Then open **http://localhost:8080** — or open `game/index.html` directly in a browser.

### What you'll learn

An interactive **coal-mine metaphor** for stack canaries:

1. **Coal mine view** — buffer = work zone, yellow bird = canary, exit door = return address  
2. **Stack frame view** — the same layout as memory slots  
3. **Terminal** — type input into a fake vulnerable program  

Six levels: safe cargo → toxic overflow → stack reveal → epilogue check → guard off → derived canary.

## C library (WIP)

`libcanary/` is a small teaching library for planting / checking canaries (`canary_deriv`, `canary_check`, `canary_fail`).
