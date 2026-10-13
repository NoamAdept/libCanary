/*
 * libcanary — implementation.
 *
 * Read this top to bottom: it is the whole mitigation in one short file.
 * A stack canary is nothing more than "plant a secret random value in front
 * of the thing you want to protect, then check the value is still there before
 * you trust that thing." Everything below is bookkeeping around that idea.
 *
 * SPDX-License-Identifier: MIT
 */
#include "canary.h"

#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#if defined(__linux__)
#include <sys/random.h> /* getrandom() */
#endif

/* ----------------------------------------------------------------------------
 * The per-process secret
 * ------------------------------------------------------------------------- */

static uint64_t g_secret;      /* the canary value, chosen once per process  */
static int      g_initialised; /* 0 until lc_init() has run                   */

/*
 * Fill `out` with `len` cryptographically-random bytes. Returns 1 on success.
 * We try, in order: getrandom(2), then /dev/urandom. Callers must handle the
 * 0 return by mixing in a weaker fallback (see lc_init).
 */
static int fill_random(void *out, size_t len)
{
#if defined(__linux__)
    /* getrandom() with no flags blocks only until the pool is seeded, which
     * has already happened long before any normal program runs. */
    ssize_t got = getrandom(out, len, 0);
    if (got == (ssize_t)len)
        return 1;
#endif
    int fd = open("/dev/urandom", O_RDONLY | O_CLOEXEC);
    if (fd >= 0) {
        size_t off = 0;
        while (off < len) {
            ssize_t r = read(fd, (unsigned char *)out + off, len - off);
            if (r <= 0)
                break;
            off += (size_t)r;
        }
        close(fd);
        if (off == len)
            return 1;
    }
    return 0;
}

void lc_init(void)
{
    if (g_initialised)
        return;

    uint64_t secret = 0;
    if (!fill_random(&secret, sizeof secret)) {
        /* Last-resort fallback for exotic environments with no CSPRNG: mix
         * several hard-to-predict runtime values. This is weaker than a real
         * CSPRNG — but we only reach it if both getrandom() and /dev/urandom
         * failed, which essentially never happens on a normal system. */
        struct timespec ts = {0, 0};
        clock_gettime(CLOCK_MONOTONIC, &ts);
        secret ^= (uint64_t)ts.tv_nsec;
        secret ^= (uint64_t)ts.tv_sec * 0x9E3779B97F4A7C15ULL;
        secret ^= (uint64_t)(uintptr_t)&secret;      /* a stack address (ASLR) */
        secret ^= (uint64_t)(uintptr_t)&lc_init << 1; /* a code address (ASLR) */
        secret ^= (uint64_t)getpid() * 0xD1B54A32D192ED03ULL;
    }

    /* Force the least-significant byte to 0x00 (a "terminator canary"). String
     * routines stop at the first NUL, so an attacker overflowing with a C
     * string cannot write a value whose low byte matches, and cannot copy the
     * canary out through a string read. glibc's canary uses the same trick. */
    secret &= ~(uint64_t)0xFF;

    g_secret = secret;
    g_initialised = 1;
}

/* Run lc_init() automatically before main(), so guards planted in any
 * function already have a live secret to use. */
__attribute__((constructor))
static void lc_autoinit(void)
{
    lc_init();
}

uint64_t lc_canary_value(void)
{
    if (!g_initialised)
        lc_init();
    return g_secret;
}

/* ----------------------------------------------------------------------------
 * Failing closed
 * ------------------------------------------------------------------------- */

void lc_report_and_abort(const char *where)
{
    /* Use low-level write() rather than fprintf: the heap and stdio buffers
     * may already be corrupted by the overflow we just detected. */
    const char prefix[] = "*** libcanary: stack corruption detected in ";
    const char suffix[] = "() — aborting ***\n";
    /* (void)! swallows write()'s warn_unused_result attribute: there is
     * nothing sensible to do if the diagnostic itself fails to print. */
    (void)!write(STDERR_FILENO, prefix, sizeof prefix - 1);
    if (where)
        (void)!write(STDERR_FILENO, where, strlen(where));
    (void)!write(STDERR_FILENO, suffix, sizeof suffix - 1);

    /* Fail closed: never return into a frame whose return address may be
     * attacker-controlled. abort() raises SIGABRT and does not come back. */
    abort();
}

/* ----------------------------------------------------------------------------
 * Guarded buffer (redzone canary)
 * ------------------------------------------------------------------------- */

int lc_buf_ok(const lc_buf *b)
{
    return b && b->guard && *b->guard == lc_canary_value();
}

void lc_buf_fail(const lc_buf *b)
{
    (void)b;
    lc_report_and_abort("guarded buffer");
}

void lc_buf_check(const lc_buf *b)
{
    if (!lc_buf_ok(b))
        lc_buf_fail(b);
}

/* ----------------------------------------------------------------------------
 * Legacy derived-canary API (lesson L10)
 *
 * A canary derived per call site: XOR the secret with the frame and return
 * addresses so the planted value is unique to where it was planted.
 * ------------------------------------------------------------------------- */

void canary_init(void)
{
    lc_init();
}

uint64_t canary_deriv(void *frame_addr, void *ret_addr, void *store_addr)
{
    (void)store_addr;
    uint64_t canary = lc_canary_value();
    canary ^= (uint64_t)(uintptr_t)ret_addr;
    canary ^= ((uint64_t)(uintptr_t)frame_addr * 0xdeadbeefcafebabeULL);
    return canary;
}

uint64_t canary_check(void *frame_addr, void *ret_addr, void *store_addr)
{
    uint64_t expected = canary_deriv(frame_addr, ret_addr, store_addr);
    uint64_t stored = 0;
    memcpy(&stored, store_addr, sizeof stored);
    return expected ^ stored; /* 0 == intact */
}

void canary_fail(void)
{
    lc_report_and_abort("L10 derived canary");
}
