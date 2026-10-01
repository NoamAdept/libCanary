/* L07 — Stack protector DISABLED (−fno-stack-protector)
 * Binary: bin/L07_guard_off
 * Build:  cc -O0 -fno-stack-protector -o bin/L07_guard_off lessons/L07_guard_off.c
 *
 * Lesson: Same overflow with no bird. Return address can be corrupted silently.
 */
#include "common.h"

void open_gate(const char *src) {
    char buf[BUF_SMALL];
    strcpy(buf, src); /* UNSAFE, and no canary */
    printf("gate opened for %s\n", buf);
}

int main(int argc, char **argv) {
    lesson_banner("L07", "guard OFF (-fno-stack-protector)");
    if (argc < 2) {
        fprintf(stderr, "usage: %s <payload>\n", argv[0]);
        return 1;
    }
    open_gate(argv[1]);
    puts("returned — if RET was smashed, we may never get here cleanly");
    return 0;
}
