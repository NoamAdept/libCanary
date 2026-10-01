/* L06 — Function epilogue canary check (smash → abort)
 * Binary: bin/L06_epilogue_check
 * Build:  cc -O0 -fstack-protector-strong -o bin/L06_epilogue_check lessons/L06_epilogue_check.c
 *
 * Lesson: Before ret, the compiler emits a canary check. Mismatch → __stack_chk_fail.
 */
#include "common.h"

__attribute__((noinline))
void worker(const char *src) {
    char buf[BUF_SMALL];
    strcpy(buf, src);
    printf("work done on '%s'\n", buf);
    /* epilogue here: compare canary, else call __stack_chk_fail */
}

int main(int argc, char **argv) {
    lesson_banner("L06", "epilogue canary check");
    if (argc < 2) {
        fprintf(stderr, "usage: %s <payload>\n", argv[0]);
        return 1;
    }
    worker(argv[1]);
    puts("back in main — only if canary matched");
    return 0;
}
