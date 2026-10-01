/* L05 — Buffer size mismatch: tiny stack buf, huge read
 * Binary: bin/L05_size_mismatch
 * Build:  cc -O0 -fstack-protector-strong -o bin/L05_size_mismatch lessons/L05_size_mismatch.c
 *
 * Lesson: Declaring char buf[8] then reading with a larger limit (or none) is a classic bug.
 */
#include "common.h"

void ingest(void) {
    char buf[BUF_SMALL];
    char big[64];
    printf("Enter data: ");
    fflush(stdout);
    if (!fgets(big, sizeof(big), stdin)) {
        return;
    }
    /* BUG: copies up to 63 bytes into an 8-byte buffer */
    strcpy(buf, big);
    printf("stored: %s\n", buf);
}

int main(void) {
    lesson_banner("L05", "buffer size mismatch");
    ingest();
    return 0;
}
