CC ?= gcc
CFLAGS_COMMON := -O0 -g -Wall -Wextra -I lessons -I libcanary
CFLAGS_PROT   := $(CFLAGS_COMMON) -fstack-protector-strong
CFLAGS_OFF    := $(CFLAGS_COMMON) -fno-stack-protector
CFLAGS_HARD   := -O2 -g -Wall -Wextra -I lessons -fstack-protector-strong -D_FORTIFY_SOURCE=2

BIN := bin
LESSON_BINS := \
	$(BIN)/L01_safe_copy \
	$(BIN)/L02_strcpy_overflow \
	$(BIN)/L03_stack_layout \
	$(BIN)/L04_gets_banned \
	$(BIN)/L05_size_mismatch \
	$(BIN)/L06_epilogue_check \
	$(BIN)/L07_guard_off \
	$(BIN)/L08_off_by_one \
	$(BIN)/L09_strncpy_pitfall \
	$(BIN)/L10_libcanary \
	$(BIN)/L11_safe_fgets \
	$(BIN)/L12_hardening

.PHONY: all lessons game serve bundle clean test-lessons

all: lessons bundle

lessons: $(LESSON_BINS)

$(BIN):
	mkdir -p $(BIN)

$(BIN)/L01_safe_copy: lessons/L01_safe_copy.c lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_PROT) -o $@ lessons/L01_safe_copy.c

$(BIN)/L02_strcpy_overflow: lessons/L02_strcpy_overflow.c lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_PROT) -o $@ lessons/L02_strcpy_overflow.c

$(BIN)/L03_stack_layout: lessons/L03_stack_layout.c lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_PROT) -o $@ lessons/L03_stack_layout.c

$(BIN)/L04_gets_banned: lessons/L04_gets_banned.c lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_PROT) -o $@ lessons/L04_gets_banned.c

$(BIN)/L05_size_mismatch: lessons/L05_size_mismatch.c lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_PROT) -o $@ lessons/L05_size_mismatch.c

$(BIN)/L06_epilogue_check: lessons/L06_epilogue_check.c lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_PROT) -o $@ lessons/L06_epilogue_check.c

$(BIN)/L07_guard_off: lessons/L07_guard_off.c lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_OFF) -o $@ lessons/L07_guard_off.c

$(BIN)/L08_off_by_one: lessons/L08_off_by_one.c lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_PROT) -o $@ lessons/L08_off_by_one.c

$(BIN)/L09_strncpy_pitfall: lessons/L09_strncpy_pitfall.c lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_PROT) -o $@ lessons/L09_strncpy_pitfall.c

$(BIN)/L10_libcanary: lessons/L10_libcanary.c libcanary/canary.c libcanary/canary.h lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_PROT) -pthread -o $@ lessons/L10_libcanary.c libcanary/canary.c

$(BIN)/L11_safe_fgets: lessons/L11_safe_fgets.c lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_PROT) -o $@ lessons/L11_safe_fgets.c

$(BIN)/L12_hardening: lessons/L12_hardening.c lessons/common.h | $(BIN)
	$(CC) $(CFLAGS_HARD) -o $@ lessons/L12_hardening.c

bundle:
	python3 tools/bundle_lessons.py

game serve: bundle
	@echo "CANARY MINE → http://localhost:8080"
	python3 -m http.server 8080 --directory game

test-lessons: lessons
	@echo "== L01 safe ==" && $(BIN)/L01_safe_copy alice
	@echo "== L02 smash (expect abort) ==" && ($(BIN)/L02_strcpy_overflow AAAAAAAAAAAAAAAA; echo exit:$$?) || true
	@echo "== L07 guard off ==" && ($(BIN)/L07_guard_off AAAA; echo exit:$$?) || true
	@echo "== L10 libcanary ==" && $(BIN)/L10_libcanary miner
	@echo "== L11 safe ==" && printf 'bob\n' | $(BIN)/L11_safe_fgets
	@echo "== L12 harden ==" && $(BIN)/L12_hardening miner
	@echo "lesson smoke tests done"

clean:
	rm -rf $(BIN)
	rm -f game/lesson_bundle.js
