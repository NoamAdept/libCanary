/* L10 — Manual canary with libcanary (derived secret ⊕ frame)
 * Binary: bin/L10_libcanary
 * Build:  see Makefile (links libcanary/canary.c)
 *
 * Lesson: Plant a derived canary, check before return — mirrors compiler SSP.
 */
#include "common.h"
#include "../libcanary/canary.h"

void guarded(const char *src) {
    char buf[BUF_SMALL];
    uint64_t canary_slot;
    void *frame = __builtin_frame_address(0);
    void *ret = __builtin_return_address(0);

    canary_slot = canary_deriv(frame, ret, &canary_slot);

    strncpy(buf, src, sizeof(buf) - 1);
    buf[sizeof(buf) - 1] = '\0';
    printf("libcanary greet: %s\n", buf);

    if (canary_check(frame, ret, &canary_slot) != 0) {
        canary_fail();
    }
}

int main(int argc, char **argv) {
    lesson_banner("L10", "libcanary derived canary");
    canary_init();
    if (argc < 2) {
        fprintf(stderr, "usage: %s <name>\n", argv[0]);
        return 1;
    }
    guarded(argv[1]);
    puts("libcanary check passed");
    return 0;
}
