/* L08 — Off-by-one: write one byte past the end
 * Binary: bin/L08_off_by_one
 * Build:  cc -O0 -fstack-protector-strong -o bin/L08_off_by_one lessons/L08_off_by_one.c
 *
 * Lesson: Loops using <= length or writing the NUL past the last index corrupt neighbors
 * (often the canary's low byte on some layouts).
 */
#include "common.h"

void fill(const char *src) {
    char buf[BUF_SMALL];
    size_t n = strlen(src);
    size_t i;
    /* BUG: uses <= so one extra byte is written when n == BUF_SMALL */
    for (i = 0; i <= n && i <= BUF_SMALL; i++) {
        buf[i] = src[i];
    }
    printf("filled %zu bytes (buggy bound)\n", n);
}

int main(int argc, char **argv) {
    lesson_banner("L08", "off-by-one write");
    if (argc < 2) {
        fprintf(stderr, "usage: %s <exactly-8-chars-ideal>\n", argv[0]);
        return 1;
    }
    fill(argv[1]);
    return 0;
}
