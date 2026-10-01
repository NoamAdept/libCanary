/* L03 — Same overflow, annotated stack layout
 * Binary: bin/L03_stack_layout
 * Build:  cc -O0 -fstack-protector-strong -o bin/L03_stack_layout lessons/L03_stack_layout.c
 *
 * Lesson: Visualize [buffer][canary][saved RBP][return addr] growth direction.
 */
#include "common.h"

void vulnerable(const char *src) {
    char buf[BUF_SMALL];
    printf("stack sketch (low → high):\n");
    printf("  buf[%d]  @ %p\n", BUF_SMALL, (void *)buf);
    printf("  ...canary / saved rbp / ret above buf on many ABIs...\n");
    strcpy(buf, src); /* UNSAFE */
    printf("buf = %s\n", buf);
}

int main(int argc, char **argv) {
    lesson_banner("L03", "stack layout under overflow");
    if (argc < 2) {
        fprintf(stderr, "usage: %s <payload>\n", argv[0]);
        return 1;
    }
    vulnerable(argv[1]);
    return 0;
}
