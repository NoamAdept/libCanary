# CANARY MINE

<p align="center">
  <strong>6 defensive challenges about stack canaries</strong><br />
  Full-screen split: mine + stack | C code · progress saved on fail
</p>

<p align="center">
  <img src="docs/images/canary-mine.png" alt="CANARY MINE" width="720" />
</p>

## Quick start

```bash
make all && make game   # http://localhost:8080
```

## Challenges

| # | Goal |
|--:|------|
| 1 | Find the canary between buffer and return address |
| 2 | Safe short input — guard stays intact |
| 3 | Overflow and **observe** `__stack_chk_fail` |
| 4 | Same bug with protector off — EXIT falls |
| 5 | Spot the unbounded C API |
| 6 | Pick the defender build / API pattern |

Failing a challenge retries **that** challenge only (progress is saved). This teaches recognition and hardening — not bypass techniques.

```bash
make lessons && make test-lessons
```
