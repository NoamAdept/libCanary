# CANARY MINE

<p align="center">
  <strong>Learn stack canaries in 6 short defensive challenges</strong><br />
  One goal per screen · mine visual matches the lesson · optional stack/C peek
</p>

<p align="center">
  <img src="docs/images/canary-mine.png" alt="CANARY MINE gameplay" width="640" />
</p>

## Quick start

```bash
make all
make game   # http://localhost:8080
```

## Challenges

| # | Name | You do |
|--:|------|--------|
| 1 | Find the bird | Name what sits between buffer and EXIT |
| 2 | Safe cargo | Short input — canary stays alive |
| 3 | Smash alarm | Overflow and **observe** the abort |
| 4 | No guard | Same bug with protector off — EXIT falls |
| 5 | Spot the bug | Pick the unsafe C call |
| 6 | Pick the fix | Choose the defender build/API pattern |

Real lesson binaries still live under `lessons/` / `bin/` for offline reading — the game teaches recognition and safe patterns, not exploitation.

```bash
make lessons
./bin/L01_safe_copy alice
make test-lessons
```
