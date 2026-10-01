#ifndef LESSON_COMMON_H
#define LESSON_COMMON_H

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define BUF_SMALL 8
#define BUF_MED   16

static inline void lesson_banner(const char *id, const char *title) {
    fprintf(stderr, "[%s] %s\n", id, title);
}

#endif
