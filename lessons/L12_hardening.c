/* L12 — Hardening checklist binary (protector + fortified libc)
 * Binary: bin/L12_hardening
 * Build:  cc -O2 -fstack-protector-strong -D_FORTIFY_SOURCE=2 \
 *            -o bin/L12_hardening lessons/L12_hardening.c
 *
 * Lesson: Defense in depth — canaries + fortified unchecked copies + safe APIs.
 */
#include "common.h"

void harden_demo(const char *src) {
    char buf[BUF_MED];
    /* With _FORTIFY_SOURCE, oversized constant copies can be caught at compile/runtime */
    snprintf(buf, sizeof(buf), "%s", src);
    printf("hardened echo: %s\n", buf);
}

int main(int argc, char **argv) {
    lesson_banner("L12", "hardening checklist");
    puts("checklist:");
    puts("  [x] -fstack-protector-strong");
    puts("  [x] -D_FORTIFY_SOURCE=2");
    puts("  [x] fgets/snprintf instead of gets/strcpy");
    puts("  [x] never disable canaries in production");
    if (argc < 2) {
        fprintf(stderr, "usage: %s <short-name>\n", argv[0]);
        return 1;
    }
    harden_demo(argv[1]);
    puts("mission complete");
    return 0;
}
