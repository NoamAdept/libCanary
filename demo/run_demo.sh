#!/usr/bin/env bash
#
# run_demo.sh — build both demos twice (unprotected vs libcanary-protected) and
# run them side by side so you can see what the stack canary prevents.
#
# Everything here is local and self-contained. No network, no other processes.
#
set -u

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
LIB="$ROOT/libcanary"
OUT="$ROOT/bin/demo"
CC="${CC:-cc}"

mkdir -p "$OUT"

# -fno-stack-protector so the ONLY protection in the "protected" build is
# libcanary itself — otherwise the compiler's own canary would also fire and
# you couldn't tell which one caught the overflow.
CFLAGS="-O0 -g -Wall -Wextra -fno-stack-protector -I$LIB"

rule()  { printf '\n\033[1m%s\033[0m\n' "----------------------------------------------------------------------"; }
title() { printf '\n\033[1;36m### %s\033[0m\n' "$1"; }

echo "Building demos with: $CC $CFLAGS"
$CC $CFLAGS                 -o "$OUT/exploit_unprotected"  "$HERE/exploit_demo.c"                         || exit 1
$CC $CFLAGS -DUSE_LIBCANARY -o "$OUT/exploit_protected"    "$HERE/exploit_demo.c"  "$LIB/canary.c"        || exit 1
$CC $CFLAGS                 -o "$OUT/overflow_unprotected" "$HERE/overflow_demo.c"                        || exit 1
$CC $CFLAGS -DUSE_LIBCANARY -o "$OUT/overflow_protected"   "$HERE/overflow_demo.c" "$LIB/canary.c"        || exit 1

# Helper: run a command, report its exit status / signal in human terms.
run() {
    "$@"
    local rc=$?
    if   [ $rc -eq 0 ];   then printf '\033[0;32m[exit 0 — ran to completion]\033[0m\n'
    elif [ $rc -gt 128 ]; then printf '\033[0;33m[killed by signal %d — e.g. SIGABRT=6, SIGSEGV=11]\033[0m\n' "$((rc-128))"
    else                       printf '\033[0;33m[exit %d]\033[0m\n' "$rc"
    fi
    return 0
}

title "DEMO 1: control-flow hijack via a function pointer past the buffer"

rule; echo "A) UNPROTECTED — the overflow overwrites the function pointer:"; rule
run "$OUT/exploit_unprotected"

rule; echo "B) PROTECTED (libcanary) — the canary is checked before the call:"; rule
run "$OUT/exploit_protected"

title "DEMO 2: classic strcpy stack smash"

rule; echo "A) UNPROTECTED, benign input ('alice') — works fine:"; rule
run "$OUT/overflow_unprotected" alice

rule; echo "B) UNPROTECTED, 80-byte input — smashes the stack, crashes on return:"; rule
run "$OUT/overflow_unprotected" "$(printf 'A%.0s' $(seq 1 80))"

rule; echo "C) PROTECTED (libcanary), same 80-byte input — caught, clean abort:"; rule
run "$OUT/overflow_protected" "$(printf 'A%.0s' $(seq 1 80))"

title "Takeaway"
cat <<'EOF'
  Without a canary, one missing bounds check lets an overflow reach — and
  rewrite — the data that decides where the CPU goes next (a function pointer
  or the saved return address). WITH a canary, that same overflow first has to
  cross a random secret it cannot predict, and libcanary notices and shuts the
  process down before the corrupted value is ever trusted.
EOF
