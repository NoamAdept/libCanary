# libcanary — CMake build for the library, its unit tests, and the examples.
#
#   cmake -S . -B build
#   cmake --build build
#   ctest --test-dir build        # run the unit tests
#   ./build/overflow_protected AAAAAAAA....   # try a demo by hand
#
# (The learning material in learn/ is built with the Makefile; this CMake
#  project covers the C library and its examples/tests.)

cmake_minimum_required(VERSION 3.14)
project(libcanary C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)

# ---- the library --------------------------------------------------------
add_library(canary STATIC src/canary.c)
target_include_directories(canary PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_compile_options(canary PRIVATE -O2 -g -Wall -Wextra)

# The examples must be built with the compiler's own protector OFF, so libcanary
# is unambiguously the only canary in play.
set(DEMO_FLAGS -O0 -g -Wall -Wextra -fno-stack-protector)

# ---- examples: one unprotected build and one libcanary-protected build -----
foreach(name exploit overflow)
  add_executable(${name}_unprotected examples/${name}_demo.c)
  target_include_directories(${name}_unprotected PRIVATE include)
  target_compile_options(${name}_unprotected PRIVATE ${DEMO_FLAGS})

  add_executable(${name}_protected examples/${name}_demo.c)
  target_link_libraries(${name}_protected PRIVATE canary)
  target_compile_definitions(${name}_protected PRIVATE USE_LIBCANARY)
  target_compile_options(${name}_protected PRIVATE ${DEMO_FLAGS})
endforeach()

# ---- unit tests ---------------------------------------------------------
enable_testing()
add_executable(test_canary tests/test_canary.c)
target_link_libraries(test_canary PRIVATE canary)
target_compile_options(test_canary PRIVATE ${DEMO_FLAGS})
add_test(NAME unit COMMAND test_canary)
