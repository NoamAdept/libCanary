/*
 * libcanary — a small, real stack-canary library for hardening C/C++ code
 * against stack-buffer-overflow memory corruption.
 *
 * This is a *teaching* library: every line is meant to be read by students
 * learning how a stack canary (a.k.a. stack cookie / stack-smashing protector)
 * actually works under the hood. It is deliberately simple, but it is also a
 * genuine, working mitigation you can drop into a function to detect that a
 * buffer overflow has clobbered the bytes guarding your return address or a
 * sensitive local.
 *
 * It gives you two complementary tools:
 *
 *   1. A classic *frame canary* (LC_GUARD / LC_VERIFY). A random value is
 *      planted on the stack at function entry and re-checked before return —
 *      exactly the technique GCC/Clang emit for -fstack-protector. Use it to
 *      understand how the compiler's protector works and to protect a function
 *      the compiler is NOT instrumenting.
 *
 *   2. A deterministic *guarded buffer* (LC_GUARDED / lc_buf_check). A random
 *      guard word is placed in memory immediately after a fixed-size buffer.
 *      Any linear overflow that runs off the end of the buffer must trample the
 *      guard before it can reach anything beyond it, so corruption is caught
 *      reliably and independently of how the compiler happened to lay out the
 *      stack. This is what the before/after demo uses.
 *
 * SPDX-License-Identifier: MIT
 */
#ifndef LIBCANARY_H
#define LIBCANARY_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ----------------------------------------------------------------------------
 * Core runtime
 * ------------------------------------------------------------------------- */

/*
 * Generate the per-process canary secret.
 *
 * Called automatically before main() via a constructor, so you normally never
 * need to call it yourself. It is idempotent and thread-safe, so calling it
 * again is harmless. The secret is drawn from the OS CSPRNG (getrandom(2),
 * falling back to /dev/urandom, falling back to an ASLR-seeded mix) and then
 * masked so its least-significant byte is 0x00. The null byte is deliberate:
 * it stops string functions like strcpy/strcat — which stop at a NUL — from
 * leaking or faithfully reproducing the canary. This mirrors glibc's canary.
 */
void lc_init(void);

/*
 * Return the current per-process canary value. Every guard is armed with this
 * value and every check compares against it. Cheap after the first call.
 */
uint64_t lc_canary_value(void);

/*
 * Report that a canary was found corrupted and terminate the process safely.
 *
 * "Safely" means: we do NOT return into a frame whose return address may have
 * been overwritten, and we do NOT run normal cleanup that an attacker might
 * have corrupted. We print a one-line diagnostic to stderr and raise SIGABRT
 * via abort(), which is the same fail-closed behaviour as __stack_chk_fail.
 *
 * `where` is a short label (typically the function name) included in the
 * message. This function never returns.
 */
void lc_report_and_abort(const char *where) __attribute__((noreturn));

/* ----------------------------------------------------------------------------
 * Tool 1 — classic frame canary (the textbook stack cookie)
 *
 *   void risky(const char *in) {
 *       LC_GUARD;                 // plant the cookie at function entry
 *       char name[32];
 *       strncpy(name, in, sizeof name - 1);
 *       ...
 *       LC_VERIFY();              // check it right before every return
 *   }
 *
 * Declare LC_GUARD as the FIRST local in the function so the compiler is free
 * to place the cookie between your buffers and the saved return address, and
 * build the function with -fno-stack-protector if you want this to be the only
 * canary present (otherwise the compiler's own protector also runs — which is
 * perfectly fine, and the point of lesson L06).
 * ------------------------------------------------------------------------- */

#define LC_GUARD      volatile uint64_t __lc_cookie = lc_canary_value()
#define LC_VERIFY()                                                            \
    do {                                                                       \
        if (__lc_cookie != lc_canary_value())                                  \
            lc_report_and_abort(__func__);                                     \
    } while (0)

/* ----------------------------------------------------------------------------
 * Tool 2 — deterministic guarded buffer (a redzone canary)
 *
 *   void handle(const char *in) {
 *       LC_GUARDED(name, 32);                 // 32-byte buffer + trailing guard
 *       strcpy((char *)name.data, in);        // untrusted copy into name.data
 *       lc_buf_check(&name);                   // aborts if the guard was hit
 *       puts((char *)name.data);
 *   }
 *
 * The guard word lives in memory immediately after the buffer, so a linear
 * overflow past name.data clobbers it before reaching anything else. This
 * catches the classic unbounded-strcpy overflow every time, regardless of the
 * compiler's stack layout — which is why the demo uses it.
 * ------------------------------------------------------------------------- */

typedef struct lc_buf {
    unsigned char *data;  /* start of the writable region       */
    size_t         size;  /* capacity of data, in bytes         */
    uint64_t      *guard; /* guard word, sits right after data  */
} lc_buf;

/* Declare a guarded buffer `name` of `n` bytes and arm its guard. */
#define LC_GUARDED(name, n)                                                    \
    struct {                                                                   \
        unsigned char __d[(n)];                                                \
        uint64_t      __g;                                                     \
    } name##__box;                                                             \
    name##__box.__g = lc_canary_value();                                       \
    lc_buf name = { name##__box.__d, (size_t)(n), &name##__box.__g }

/* Return 1 if the guard is intact, 0 if it was overwritten. */
int  lc_buf_ok(const lc_buf *b);

/* Abort because this buffer's guard was corrupted. Never returns. */
void lc_buf_fail(const lc_buf *b) __attribute__((noreturn));

/* Convenience: verify and, on corruption, report + abort. */
void lc_buf_check(const lc_buf *b);

/* ----------------------------------------------------------------------------
 * Legacy derived-canary API (kept so lesson L10 keeps building).
 *
 * These implement a canary *derived* from the frame and return address XORed
 * with the secret, so the planted value differs per call site. canary_check
 * returns 0 when intact and non-zero when corrupted.
 * ------------------------------------------------------------------------- */
void     canary_init(void);
uint64_t canary_deriv(void *frame_addr, void *ret_addr, void *store_addr);
uint64_t canary_check(void *frame_addr, void *ret_addr, void *store_addr);
void     canary_fail(void) __attribute__((noreturn));

#ifdef __cplusplus
} /* extern "C" */
#endif

#endif /* LIBCANARY_H */
