# libcanary examples — see the overflow, then see it stopped

Two tiny programs, each compiled **twice** from the same source: once with no
protection, once hardened with libcanary. Run them side by side and watch what
a stack canary actually prevents.

Everything here is **local and self-contained** — no network, no other
processes. The "attacker payload" is built inside the program from a function's
own address, so the result is identical on every machine.

## Run it

```bash
make run-examples   # builds + runs the whole comparison
bash examples/run_demo.sh
```

## What each demo shows

### `exploit_demo.c` — control-flow hijack

A 16-byte buffer sits right in front of a function pointer the program is about
to call:

```
[ buf[16] ][ guard (8) ][ action pointer (8) ]
  low addresses  ------------------>  high addresses
```

An unbounded copy overflows `buf` and rewrites `action`.

- **Unprotected:** the pointer is overwritten and `danger_action()` runs — a
  stand-in for "attacker code executes." Control flow has been stolen.
- **Protected:** the overflow must cross the random `guard` to reach the
  pointer. libcanary checks the guard *before* the call, sees it changed, and
  aborts. The hijacked pointer is never invoked.

### `overflow_demo.c` — classic strcpy stack smash

A textbook `strcpy` into a fixed 32-byte buffer with no length check.

- **Unprotected:** a short name is fine; an 80-byte name runs off the buffer,
  corrupts the saved return address, and the process dies with a segfault when
  the function returns (in a real bug it might instead run attacker-chosen
  code).
- **Protected:** the same 80-byte input trips libcanary's guard and the program
  aborts cleanly with a clear diagnostic, before returning anywhere dangerous.

## The point

The vulnerability — a missing bounds check — is identical in both builds. The
only difference is the random secret libcanary plants between the buffer and the
thing worth protecting. That one unpredictable value turns a silent, exploitable
corruption into a loud, safe crash.

> These programs crash and abort **on purpose**. That is the lesson: a canary
> trades a dangerous, quiet failure for a safe, obvious one.
