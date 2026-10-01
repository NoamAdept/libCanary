#ifndef LIBCANARY_H
#define LIBCANARY_H

#include <stdint.h>

void canary_init(void);
uint64_t canary_deriv(void *frame_addr, void *ret_addr, void *store_addr);
uint64_t canary_check(void *frame_addr, void *ret_addr, void *store_addr);
void canary_fail(void);

#endif
