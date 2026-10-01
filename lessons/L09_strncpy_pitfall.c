/* L09 — strncpy without forced NUL termination
 * Binary: bin/L09_strncpy_pitfall
 * Build:  cc -O0 -fstack-protector-strong -o bin/L09_strncpy_pitfall lessons/L09_strncpy_pitfall.c
 *
 * Lesson: strncpy may omit the terminating NUL when src length >= n.
 * Always set buf[n-1] = '\\0' (or use safer APIs).
 */
#include "common.h"

void bad_copy(const char *src) {
    char buf[BUF_SMALL];
    strncpy(buf, src, sizeof(buf)); /* if src >= 8, buf has NO NUL */
    /* BUG: printf walks past buf looking for '\\0' — memory safety hazard */
    printf("buf prints as: %s\n", buf);
}

int main(int argc, char **argv) {
    lesson_banner("L09", "strncpy NUL pitfall");
    if (argc < 2) {
        fprintf(stderr, "usage: %s <string-of-len-8+>\n", argv[0]);
        return 1;
    }
    bad_copy(argv[1]);
    return 0;
}
