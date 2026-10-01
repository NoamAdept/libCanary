/* L01 — Safe short copy with stack protector ON
 * Binary: bin/L01_safe_copy
 * Build:  cc -O0 -fstack-protector-strong -o bin/L01_safe_copy lessons/L01_safe_copy.c
 *
 * Lesson: When input fits the buffer, the canary stays intact and main returns normally.
 */
#include "common.h"

void greet(const char *name) {
    char buf[BUF_SMALL];
    /* Bound the copy — still easy to misuse if src is longer than BUF_SMALL-1 */
    strncpy(buf, name, sizeof(buf) - 1);
    buf[sizeof(buf) - 1] = '\0';
    printf("hello, %s\n", buf);
}

int main(int argc, char **argv) {
    lesson_banner("L01", "safe short copy (protector ON)");
    if (argc < 2) {
        fprintf(stderr, "usage: %s <name>\n", argv[0]);
        return 1;
    }
    greet(argv[1]);
    puts("exit ok — canary untouched");
    return 0;
}
