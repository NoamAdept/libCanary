/* L02 — Unbounded strcpy overflow → stack smashing detected
 * Binary: bin/L02_strcpy_overflow
 * Build:  cc -O0 -fstack-protector-strong -o bin/L02_strcpy_overflow lessons/L02_strcpy_overflow.c
 *
 * Lesson: strcpy does not know the destination size. Long input kills the canary.
 */
#include "common.h"

void copy_name(const char *src) {
    char buf[BUF_SMALL];
    strcpy(buf, src); /* UNSAFE: no bounds check */
    printf("copied: %s\n", buf);
}

int main(int argc, char **argv) {
    lesson_banner("L02", "strcpy overflow (protector ON)");
    if (argc < 2) {
        fprintf(stderr, "usage: %s <name>\n", argv[0]);
        return 1;
    }
    copy_name(argv[1]);
    puts("returned from copy_name");
    return 0;
}
