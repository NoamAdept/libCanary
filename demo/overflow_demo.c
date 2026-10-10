/*
 * overflow_demo.c — the classic "stack smashing" picture: an unbounded strcpy
 * into a fixed buffer, built two ways.
 *
 *   Unprotected build  (default):          long input runs off the buffer,
 *                                           corrupts the saved return address,
 *                                           and the process crashes on return
 *                                           (or worse — silently misbehaves).
 *   Protected build    (-DUSE_LIBCANARY):   a guard word sits just past the
 *                                           buffer; the same overflow trips it
 *                                           and libcanary aborts cleanly before
 *                                           the function ever returns.
 *
 * Usage:  overflow_demo <string>
 *
 * Self-contained and local: the only input is argv[1].
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef USE_LIBCANARY
#include "canary.h"
#endif

#define CAP 32

static void greet(const char *name)
{
#ifdef USE_LIBCANARY
    /* A 32-byte buffer with a canary planted immediately after it. */
    LC_GUARDED(buf, CAP);
    strcpy((char *)buf.data, name);   /* still unbounded — but now guarded */
    lc_buf_check(&buf);               /* aborts if the overflow hit the guard */
    printf("    hello, %s\n", (char *)buf.data);
#else
    /* No protection at all: whatever runs past buf[] corrupts the stack. */
    char buf[CAP];
    strcpy(buf, name);                /* THE BUG: no bounds check */
    printf("    hello, %s\n", buf);
#endif
}

int main(int argc, char **argv)
{
#ifdef USE_LIBCANARY
    const char *mode = "PROTECTED (libcanary)";
#else
    const char *mode = "UNPROTECTED";
#endif
    printf("== overflow_demo [%s] ==\n", mode);

    if (argc < 2) {
        fprintf(stderr, "usage: %s <string>\n", argv[0]);
        return 2;
    }

    printf("[in] %zu bytes into a %d-byte buffer\n", strlen(argv[1]), CAP);
    greet(argv[1]);
    puts("[ok] greet() returned normally");
    return 0;
}
