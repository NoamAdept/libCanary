/*
 * Teaching-oriented libcanary — fixed enough to link lesson L10.
 * Not a production stack protector.
 */
#include <unistd.h>
#include <pthread.h>
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <fcntl.h>
#include <string.h>

static uint64_t global_secret;
static pthread_once_t canary_once = PTHREAD_ONCE_INIT;

void canary_init(void) {
    int fd = open("/dev/urandom", O_RDONLY);
    if (fd >= 0) {
        ssize_t r = read(fd, &global_secret, sizeof(global_secret));
        (void)r;
        close(fd);
    } else {
        global_secret = 0xC0FFEEULL ^ (uint64_t)(uintptr_t)&global_secret;
    }
}

static void ensure_init(void) {
    pthread_once(&canary_once, canary_init);
}

uint64_t canary_deriv(void *frame_addr, void *ret_addr, void *store_addr) {
    (void)store_addr;
    ensure_init();
    uint64_t canary = global_secret;
    canary ^= (uint64_t)(uintptr_t)ret_addr;
    canary ^= ((uint64_t)(uintptr_t)frame_addr * 0xdeadbeefcafebabeULL);
    return canary;
}

uint64_t canary_check(void *frame_addr, void *ret_addr, void *store_addr) {
    uint64_t expected = canary_deriv(frame_addr, ret_addr, store_addr);
    uint64_t stored = 0;
    memcpy(&stored, store_addr, sizeof(stored));
    return expected ^ stored;
}

void canary_fail(void) {
    const char msg[] = "canary check failed!\n";
    write(STDERR_FILENO, msg, sizeof(msg) - 1);
    _exit(1);
}
