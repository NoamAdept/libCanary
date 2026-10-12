# libcanary

**A small, readable stack-canary library for C.** Drop a random secret in front
of the data you want to protect, check it before you trust that data, and abort
if a buffer overflow trampled it.

The whole mitigation is ~180 lines in [`src/canary.c`](src/canary.c), written to
be read as well as used. It's the same technique `-fstack-protector` uses, made
explicit so you can see it, put it where you want it, and learn from it.

```c
#include "canary.h"

void handle(const char *in) {
    LC_GUARDED(buf, 32);              // 32-byte buffer + trailing random guard
    strcpy((char *)buf.data, in);     // untrusted, unbounded copy
    lc_buf_check(&buf);               // overflowed? → diagnostic + abort()
    puts((char *)buf.data);
}
```

```text
$ ./overflow_protected AAAAAAAA…(80 bytes)
*** libcanary: stack corruption detected in guarded buffer() — aborting ***
```

> **Learning about stack canaries?** This repo also has a companion course:
> **[CANARY MINE](https://noamadept.github.io/libCanary/)**, an 8-bit browser game
> with 12 lessons. See [`learn/`](learn/).

---

## Quick start

```bash
make            # build lib/libcanary.a and run the unit tests
cc app.c lib/libcanary.a -I include -o app
```

Or with CMake:

```bash
cmake -S . -B build && cmake --build build && ctest --test-dir build
```

From a CMake project of your own you can `add_subdirectory(libcanary)` and
`target_link_libraries(your_target PRIVATE canary)`.

## API

The full API is in [`include/canary.h`](include/canary.h). There are two ways to
use it.

### 1. Frame canary: `LC_GUARD` / `LC_VERIFY()`

A classic stack cookie, the same thing the compiler emits for
`-fstack-protector`. Plant it at function entry and check it before you return.

```c
void risky(const char *in) {
    LC_GUARD;                         // must be the first local
    char name[32];
    strncpy(name, in, sizeof name - 1);
    name[sizeof name - 1] = '\0';
    /* ... */
    LC_VERIFY();                      // before every return
}
```

Where the cookie actually sits relative to your buffers is up to the compiler's
stack layout. Use this to understand the protector or to guard a function the
compiler isn't instrumenting.

### 2. Guarded buffer: `LC_GUARDED` / `lc_buf_check()`

A redzone. The guard word is laid out in memory **immediately after** the
buffer, so a linear overflow always hits it first, whatever the compiler does
with the stack.

| Call | Purpose |
|------|---------|
| `LC_GUARDED(name, n)` | Declare an `n`-byte guarded buffer `name` (`name.data`, `name.size`) |
| `lc_buf_check(&name)` | Abort if the guard was overwritten |
| `lc_buf_ok(&name)` | Return `1` if intact, `0` if corrupted (no abort) |

### Runtime

| Call | Purpose |
|------|---------|
| `lc_init()` | Generate the secret. Runs automatically before `main()`, and is idempotent and thread-safe |
| `lc_canary_value()` | The per-process secret every guard is armed with |
| `lc_report_and_abort(where)` | Print a diagnostic and `abort()`. Never returns |

## How it works

- **Unpredictable secret.** The secret is drawn once per process from the OS
  CSPRNG: `getrandom(2)`, then `/dev/urandom`, then an ASLR-seeded fallback.
- **NUL low byte.** The lowest byte is forced to `0x00`, as in glibc, so
  `strcpy`-style overflows can't reproduce the canary or leak it.
- **Fails closed.** On a mismatch it prints one line to stderr and calls
  `abort()`. It never returns into a frame whose return address an attacker may
  control.

## See it work

```bash
make run-examples
```

This builds two small vulnerable programs **twice from identical source**:
once unprotected and once with libcanary.

| Example | Unprotected | With libcanary |
|---------|-------------|----------------|
| [`exploit_demo.c`](examples/exploit_demo.c): overflow rewrites a function pointer | Attacker's function runs | Caught before the call |
| [`overflow_demo.c`](examples/overflow_demo.c): 80 bytes into a 32-byte buffer | Segfault on return | Clean, loud abort |

Write-up: [`examples/README.md`](examples/README.md).

## Limitations

libcanary **detects** linear overflows after they happen. It doesn't prevent
them, and it isn't a replacement for bounds-checked code. It won't catch
arbitrary (non-linear) writes, reads or leaks of the secret, or overflows that
stay inside the buffer. Ship real code with `-fstack-protector-strong`,
`-D_FORTIFY_SOURCE=2`, and bounded APIs (`snprintf`, `fgets`).

## Repository layout

```text
include/canary.h     public header (the API)
src/canary.c         implementation
tests/               unit tests                         make test
examples/            before/after exploitation demos    make run-examples
learn/               companion course: 12 lessons + CANARY MINE game
```

## Make targets

| Target | Description |
|--------|-------------|
| `make` | Build the library and run the unit tests |
| `make lib` | Build `lib/libcanary.a` |
| `make test` | Run the unit tests |
| `make examples` / `make run-examples` | Build / build and run the before/after demos |
| `make lessons`, `make game` | Learning material (see [`learn/`](learn/)) |
| `make clean` | Remove all build output |

## License

MIT (see the SPDX header in [`include/canary.h`](include/canary.h)).
