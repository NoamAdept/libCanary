CC ?= gcc
AR ?= ar

BIN := bin
LIB := lib/libcanary.a

# ---------------------------------------------------------------------------
# The library
# ---------------------------------------------------------------------------
CFLAGS_LIB := -O2 -g -Wall -Wextra -I include

# Examples and tests are built with the compiler's protector OFF so libcanary
# is the ONLY canary present and it is unambiguous which guard caught (or
# failed to catch) the overflow.
CFLAGS_DEMO := -O0 -g -Wall -Wextra -fno-stack-protector -I include

.PHONY: all lib test examples run-examples lessons test-lessons bundle game clean

all: lib test

lib: $(LIB)

$(LIB): src/canary.c include/canary.h
	mkdir -p lib
	$(CC) $(CFLAGS_LIB) -c -o lib/canary.o src/canary.c
	$(AR) rcs $@ lib/canary.o

test: $(BIN)/test_canary
	$(BIN)/test_canary

$(BIN)/test_canary: tests/test_canary.c $(LIB) | $(BIN)
	$(CC) $(CFLAGS_DEMO) -o $@ tests/test_canary.c $(LIB)

# ---------------------------------------------------------------------------
# Examples: each program built twice, unprotected vs libcanary-protected
# (see examples/README.md)
# ---------------------------------------------------------------------------
EXAMPLE_BINS := $(foreach n,exploit overflow,$(BIN)/examples/$(n)_unprotected $(BIN)/examples/$(n)_protected)

examples: $(EXAMPLE_BINS)

$(BIN)/examples/%_unprotected: examples/%_demo.c | $(BIN)/examples
	$(CC) $(CFLAGS_DEMO) -o $@ $<

$(BIN)/examples/%_protected: examples/%_demo.c $(LIB) | $(BIN)/examples
	$(CC) $(CFLAGS_DEMO) -DUSE_LIBCANARY -o $@ $< $(LIB)

run-examples:
	bash examples/run_demo.sh

# ---------------------------------------------------------------------------
# Learning material: lesson binaries + CANARY MINE web game (see learn/)
# ---------------------------------------------------------------------------
LESSON_NAMES := L01_safe_copy L02_strcpy_overflow L03_stack_layout \
	L04_gets_banned L05_size_mismatch L06_epilogue_check L07_guard_off \
	L08_off_by_one L09_strncpy_pitfall L10_libcanary L11_safe_fgets L12_hardening
LESSON_BINS := $(addprefix $(BIN)/,$(LESSON_NAMES))

CFLAGS_LESSON := -O0 -g -Wall -Wextra -I learn/lessons -I include -fstack-protector-strong

# Per-lesson overrides: L07 turns the protector off, L12 shows release hardening.
$(BIN)/L07_guard_off: CFLAGS_LESSON := -O0 -g -Wall -Wextra -I learn/lessons -fno-stack-protector
$(BIN)/L12_hardening: CFLAGS_LESSON := -O2 -g -Wall -Wextra -I learn/lessons -fstack-protector-strong -D_FORTIFY_SOURCE=2
$(BIN)/L10_libcanary: LESSON_EXTRA := src/canary.c
$(BIN)/L10_libcanary: src/canary.c include/canary.h

lessons: $(LESSON_BINS)

$(BIN)/L%: learn/lessons/L%.c learn/lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_LESSON) -o $@ $< $(LESSON_EXTRA)

test-lessons: lessons
	@echo "== L01 safe ==" && $(BIN)/L01_safe_copy alice
	@echo "== L02 smash (expect abort) ==" && ($(BIN)/L02_strcpy_overflow AAAAAAAAAAAAAAAA; echo exit:$$?) || true
	@echo "== L07 guard off ==" && ($(BIN)/L07_guard_off AAAA; echo exit:$$?) || true
	@echo "== L10 libcanary ==" && $(BIN)/L10_libcanary miner
	@echo "== L11 safe ==" && printf 'bob\n' | $(BIN)/L11_safe_fgets
	@echo "== L12 harden ==" && $(BIN)/L12_hardening miner
	@echo "lesson smoke tests done"

bundle:
	python3 learn/bundle_lessons.py

game: bundle
	@echo "CANARY MINE → http://localhost:8080"
	python3 -m http.server 8080 --directory learn/game

# ---------------------------------------------------------------------------

$(BIN) $(BIN)/examples:
	mkdir -p $@

clean:
	rm -rf $(BIN) lib learn/game/lesson_bundle.js
