/* L04 — gets() is banned (unbounded stdin read)
 * Binary: bin/L04_gets_banned
 * Build:  cc -O0 -fstack-protector-strong -o bin/L04_gets_banned lessons/L04_gets_banned.c
 *
 * Lesson: gets() cannot limit input length. Never use it — prefer fgets().
 * (libc no longer provides gets; this shim recreates the same unbounded hazard.)
 */
#include "common.h"

/* Historic gets() semantics: read until newline/EOF with NO size check. */
static char *dangerous_gets(char *dst) {
    int c;
    char *p = dst;
    while ((c = getchar()) != EOF && c != '\n') {
        *p++ = (char)c; /* UNSAFE: may run far past dst */
    }
    *p = '\0';
    return dst;
}

void read_line(void) {
    char buf[BUF_SMALL];
    printf("Enter name: ");
    fflush(stdout);
    dangerous_gets(buf); /* NEVER DO THIS — gets() was removed from C11 for a reason */
    printf("got: %s\n", buf);
}

int main(void) {
    lesson_banner("L04", "gets() is banned");
    read_line();
    return 0;
}
