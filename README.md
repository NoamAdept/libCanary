# CANARY MINE

<p align="center">
  <strong>An 8-bit expedition into stack canaries and safe C</strong><br />
  Twelve interactive lessons · real lesson binaries · mine metaphor → memory → code → terminal
</p>

<p align="center">
  <img src="docs/images/canary-mine.png" alt="CANARY MINE gameplay: coal mine metaphor, stack frame, C lesson source, and terminal" width="860" />
</p>

<p align="center">
  <em>Buffer → canary → return address — taught as a coal mine, a stack frame, and real C.</em>
</p>

---

## What this is

**CANARY MINE** is an educational playground for stack canaries and everyday C memory-safety mistakes. You play an 8-bit mine shaft where toxic gas is an overflow, the yellow bird is the canary, and the exit door is the return address — while a live stack diagram, the actual lesson source, and a terminal stay in sync.

The same material ships as real, compilable binaries under `bin/` so you can reinforce each level outside the browser.

## Features

- **`libcanary`** — a real, linkable stack-canary library (`libcanary/`) you can
  use to harden your own C/C++ functions, with a classic frame canary and a
  deterministic guarded-buffer redzone
- **Before/after exploitation demo** (`demo/`) — the same overflow hijacking a
  program with no protection, then being caught cold by libcanary
- **12 progressive levels** from safe copy through hardening flags
- **Four synced views:** coal mine · stack frame · C lesson · terminal
- **Real C sources** in `lessons/` with matching `make` targets
- Zero-build web game (`make game`) plus optional native binaries (`make lessons`)

## Quick start

```bash
make all          # build lesson binaries + bundle C sources into the game
make game         # serve the game at http://localhost:8080
```

Open [http://localhost:8080](http://localhost:8080), press **START**, and type into the terminal as each level instructs.

### Run lesson binaries directly

```bash
./bin/L01_safe_copy alice
./bin/L02_strcpy_overflow AAAAAAAAAAAA    # expect: stack smashing detected
./bin/L07_guard_off AAAA                  # protector intentionally OFF
printf 'bob\n' | ./bin/L11_safe_fgets
make test-lessons                         # smoke-test key binaries
```

## The library: hardening your own code with `libcanary`

A stack canary is a simple idea: **plant a random secret value in front of the
thing you want to protect, then check it is still there before you trust that
thing.** If a buffer overflow ran past its bounds, it had to trample the secret
on the way — so a changed secret is proof of corruption. libcanary is that idea,
written to be read: the whole mitigation is ~120 lines in
[`libcanary/canary.c`](libcanary/canary.c).

### Build and link

```bash
make lib            # builds libcanary/libcanary.a
# then: cc your_app.c libcanary/libcanary.a -I libcanary -o your_app
```

or with CMake:

```bash
cmake -S . -B build && cmake --build build && ctest --test-dir build
```

### Two ways to use it

**1 — classic frame canary** (what `-fstack-protector` does under the hood):

```c
#include "canary.h"

void risky(const char *in) {
    LC_GUARD;                              // plant the cookie at entry
    char name[32];
    strncpy(name, in, sizeof name - 1);
    name[sizeof name - 1] = '\0';
    /* ... */
    LC_VERIFY();                           // check it before returning
}
```

**2 — deterministic guarded buffer** (a redzone that always catches a linear
overflow, whatever the compiler's stack layout):

```c
#include "canary.h"

void handle(const char *in) {
    LC_GUARDED(buf, 32);                   // 32-byte buffer + trailing guard
    strcpy((char *)buf.data, in);          // untrusted copy
    lc_buf_check(&buf);                     // aborts cleanly if the guard was hit
    puts((char *)buf.data);
}
```

The secret is drawn from the OS CSPRNG (`getrandom(2)` → `/dev/urandom` → an
ASLR-seeded fallback), chosen once per process, and its low byte is forced to
`0x00` so string copies can't reproduce or leak it. On corruption, libcanary
prints a diagnostic and `abort()`s — it **fails closed**, never returning into a
frame whose return address may be attacker-controlled. See
[`libcanary/canary.h`](libcanary/canary.h) for the full API.

## See it work: the before/after demo

```bash
make run-demo       # builds every demo twice and runs them side by side
```

One program, two builds from identical source — once unprotected, once hardened
with libcanary:

- **Control-flow hijack:** an overflow rewrites a function pointer. *Unprotected*
  → attacker code runs. *Protected* → libcanary catches it before the call.
- **Classic strcpy smash:** an 80-byte name into a 32-byte buffer. *Unprotected*
  → segfault on return. *Protected* → clean, loud abort.

The vulnerability is the same in both builds; the only difference is the canary.
Full write-up in [`demo/README.md`](demo/README.md). Everything is local and
self-contained.

## Curriculum

| Level | Binary | Topic |
|------:|--------|-------|
| 1 | [`L01_safe_copy`](lessons/L01_safe_copy.c) | Bounded `strncpy`, stack protector ON |
| 2 | [`L02_strcpy_overflow`](lessons/L02_strcpy_overflow.c) | Unbounded `strcpy` → canary smash |
| 3 | [`L03_stack_layout`](lessons/L03_stack_layout.c) | Buffer → canary → saved RBP → return address |
| 4 | [`L04_gets_banned`](lessons/L04_gets_banned.c) | Why unbounded reads / `gets` are indefensible |
| 5 | [`L05_size_mismatch`](lessons/L05_size_mismatch.c) | Tiny destination, oversized source |
| 6 | [`L06_epilogue_check`](lessons/L06_epilogue_check.c) | Function epilogue / `__stack_chk_fail` |
| 7 | [`L07_guard_off`](lessons/L07_guard_off.c) | `-fno-stack-protector` and silent hijack |
| 8 | [`L08_off_by_one`](lessons/L08_off_by_one.c) | Off-by-one writes past the buffer |
| 9 | [`L09_strncpy_pitfall`](lessons/L09_strncpy_pitfall.c) | `strncpy` without a forced NUL |
| 10 | [`L10_libcanary`](lessons/L10_libcanary.c) | Manual derived canary via `libcanary` |
| 11 | [`L11_safe_fgets`](lessons/L11_safe_fgets.c) | Defender pattern: `fgets` + `snprintf` |
| 12 | [`L12_hardening`](lessons/L12_hardening.c) | `-fstack-protector-strong` + `_FORTIFY_SOURCE` |

Lesson sources live in [`lessons/`](lessons/). The game embeds them in the **C LESSON** panel through `make bundle` → [`game/lesson_bundle.js`](game/lesson_bundle.js).

## How the game teaches

| Panel | Role |
|-------|------|
| **Coal mine** | Metaphor: buffer work zone, yellow canary, EXIT / return address |
| **Stack frame** | Same layout as memory slots, with overflow growing upward |
| **C lesson** | Exact source for the level plus its compile line |
| **Terminal** | Type input as if invoking `./bin/LXX_...` |

Safe input keeps the bird alive. Overflow turns into “toxic gas,” trips the canary, and aborts before the exit is hijacked — unless you intentionally disable the guard.

## Repository layout

```text
├── libcanary/         # The library: canary.c / canary.h (+ libcanary.a)
├── demo/              # Before/after exploitation demos + run_demo.sh
├── tests/             # Unit tests for the library (make test)
├── lessons/           # Twelve C lesson sources
├── game/              # CANARY MINE web experience
├── bin/               # Built binaries (via make lessons / demo / test)
├── docs/images/       # README screenshots
├── tools/             # Source bundler for the game
├── CMakeLists.txt     # CMake build for the library, demos, and tests
└── Makefile
```

## Build targets

| Target | Description |
|--------|-------------|
| `make all` | Build the library, lesson binaries, and the game bundle |
| `make lib` | Build the static library `libcanary/libcanary.a` |
| `make demo` | Build the before/after exploitation demos |
| `make run-demo` | Build and run the demos side by side |
| `make test` | Build and run the library unit tests |
| `make lessons` | Compile `bin/L01` … `bin/L12` |
| `make bundle` | Embed lesson sources for the web UI |
| `make game` | Serve the game on port 8080 |
| `make test-lessons` | Smoke-test representative binaries |
| `make clean` | Remove build artifacts (`bin/`, `libcanary.a`, bundle) |

## Takeaways

- Bound every copy — never rely on a canary alone to fix `gets` / `strcpy`
- The canary sits between the buffer and the saved return address
- On mismatch at function epilogue, abort before control-flow hijack
- Ship with `-fstack-protector-strong`, `_FORTIFY_SOURCE`, and safe APIs

## License

Educational project. Use and adapt for teaching stack canaries and C memory safety.
