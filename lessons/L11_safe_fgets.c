/* L11 — Safe rewrite: fgets + snprintf (no unbounded copy)
 * Binary: bin/L11_safe_fgets
 * Build:  cc -O0 -fstack-protector-strong -o bin/L11_safe_fgets lessons/L11_safe_fgets.c
 *
 * Lesson: Bound every read and every format. This is the pattern to ship.
 */
#include "common.h"

void safe_greet(void) {
    char name[BUF_MED];
    char out[64];

    printf("Enter name: ");
    fflush(stdout);
    if (!fgets(name, sizeof(name), stdin)) {
        return;
    }
    /* strip newline */
    name[strcspn(name, "\n")] = '\0';

    snprintf(out, sizeof(out), "hello, %s", name);
    puts(out);
}

int main(void) {
    lesson_banner("L11", "safe fgets + snprintf");
    safe_greet();
    puts("clean return — defender pattern");
    return 0;
}
