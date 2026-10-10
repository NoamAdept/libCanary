/*
 * test_canary.c — unit tests for libcanary.
 *
 * Covers the three things a canary library must get right:
 *   1. the secret is generated and its terminator byte is zeroed;
 *   2. an intact guard verifies, a tampered guard does not;
 *   3. checking a corrupted buffer fails closed (aborts the process).
 *
 * The abort test runs in a forked child so the parent can confirm the child
 * died from SIGABRT without taking the test runner down with it.
 */
#include "canary.h"

#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/wait.h>
#include <unistd.h>

static int failures;

#define CHECK(cond, msg)                                                       \
    do {                                                                       \
        if (cond) {                                                            \
            printf("  ok   - %s\n", msg);                                      \
        } else {                                                               \
            printf("  FAIL - %s\n", msg);                                      \
            failures++;                                                        \
        }                                                                      \
    } while (0)

static void test_secret(void)
{
    puts("[secret]");
    uint64_t a = lc_canary_value();
    uint64_t b = lc_canary_value();
    CHECK(a == b, "canary value is stable within a process");
    CHECK((a & 0xFF) == 0, "low byte is a 0x00 terminator (stops string copies)");
    CHECK(a != 0, "canary value is not all-zero");
}

static void test_guarded_buffer(void)
{
    puts("[guarded buffer]");

    LC_GUARDED(buf, 32);
    CHECK(lc_buf_ok(&buf), "freshly-armed guard verifies intact");

    /* A bounded write that stays inside the buffer must not trip the guard. */
    memcpy(buf.data, "safe payload", 12);
    CHECK(lc_buf_ok(&buf), "in-bounds write leaves the guard intact");

    /* Simulate an overflow by writing one byte past the end of the buffer. */
    buf.data[buf.size] = 0x41;
    CHECK(!lc_buf_ok(&buf), "a 1-byte overflow past the buffer is detected");
}

static void test_fail_closed(void)
{
    puts("[fail closed]");
    pid_t pid = fork();
    if (pid == 0) {
        /* Child: corrupt a guard and check it. This must abort. */
        LC_GUARDED(buf, 16);
        buf.data[buf.size] = 0xFF; /* overflow */
        lc_buf_check(&buf);        /* expected: report + abort */
        _exit(0);                  /* reached only if the check wrongly passed */
    }
    int status = 0;
    waitpid(pid, &status, 0);
    CHECK(WIFSIGNALED(status) && WTERMSIG(status) == SIGABRT,
          "lc_buf_check on a corrupted buffer aborts with SIGABRT");
}

int main(void)
{
    puts("libcanary unit tests");
    test_secret();
    test_guarded_buffer();
    test_fail_closed();

    if (failures == 0) {
        puts("\nALL TESTS PASSED");
        return 0;
    }
    printf("\n%d TEST(S) FAILED\n", failures);
    return 1;
}
