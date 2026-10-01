# libCanary / CANARY MINE

Educational stack-canary playground: **12 levels**, real **C lesson binaries**, and an 8-bit mine metaphor.

## Quick start

```bash
make all          # build binaries + bundle C sources into the game
make game         # serve http://localhost:8080
```

Open the game, or run lesson binaries directly:

```bash
./bin/L01_safe_copy alice
./bin/L02_strcpy_overflow AAAAAAAAAAAA   # expect stack smashing detected
./bin/L07_guard_off AAAA                 # protector OFF
printf 'bob\n' | ./bin/L11_safe_fgets
make test-lessons
```

## 12 lessons

| Lv | Binary | C topic |
|----|--------|---------|
| 1 | `L01_safe_copy` | Bounded `strncpy`, protector ON |
| 2 | `L02_strcpy_overflow` | Unbounded `strcpy` → smash |
| 3 | `L03_stack_layout` | Buffer → canary → RBP → RET |
| 4 | `L04_gets_banned` | Why `gets()` was removed |
| 5 | `L05_size_mismatch` | Tiny dst, huge src |
| 6 | `L06_epilogue_check` | Epilogue / `__stack_chk_fail` |
| 7 | `L07_guard_off` | `-fno-stack-protector` hijack |
| 8 | `L08_off_by_one` | `<=` loop past the end |
| 9 | `L09_strncpy_pitfall` | Missing NUL terminator |
| 10 | `L10_libcanary` | Manual derived canary (`libcanary`) |
| 11 | `L11_safe_fgets` | `fgets` + `snprintf` pattern |
| 12 | `L12_hardening` | `-fstack-protector-strong` + `_FORTIFY_SOURCE` |

Sources live in `lessons/`. The game shows the same C in the **C LESSON** panel (via `make bundle` → `game/lesson_bundle.js`).

## Game views

1. **Coal mine** — buffer / canary / EXIT metaphor  
2. **Stack frame** — memory slots  
3. **C lesson** — real source + compile line  
4. **Terminal** — type input as if running `./bin/LXX_...`
