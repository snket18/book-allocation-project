#!/usr/bin/env bash
# ==============================================================================
# Smart Library C DSA Engine Build & Test Script for macOS / Linux
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
INCLUDE_DIR="${SCRIPT_DIR}/include"
SRC_DIR="${SCRIPT_DIR}/src"
TESTS_DIR="${SCRIPT_DIR}/tests"

# Detect C compiler (clang on macOS default, fallback to gcc)
if command -v clang >/dev/null 2>&1; then
    CC="clang"
elif command -v gcc >/dev/null 2>&1; then
    CC="gcc"
else
    echo "ERROR: Neither clang nor gcc compiler found on this system." >&2
    exit 1
fi

C_FLAGS="-std=c11 -O2 -Wall -Wextra -I${INCLUDE_DIR}"

mkdir -p "${BUILD_DIR}"

ENGINE_SOURCES=(
    "${SRC_DIR}/main.c"
    "${SRC_DIR}/book.c"
    "${SRC_DIR}/shelf_2d.c"
    "${SRC_DIR}/quicksort.c"
    "${SRC_DIR}/hashtable.c"
    "${SRC_DIR}/bst.c"
    "${SRC_DIR}/shelf_optimizer.c"
    "${SRC_DIR}/cJSON.c"
)

TEST_SOURCES=(
    "${TESTS_DIR}/test_runner.c"
    "${SRC_DIR}/book.c"
    "${SRC_DIR}/shelf_2d.c"
    "${SRC_DIR}/quicksort.c"
    "${SRC_DIR}/hashtable.c"
    "${SRC_DIR}/bst.c"
    "${SRC_DIR}/shelf_optimizer.c"
    "${SRC_DIR}/cJSON.c"
)

action="${1:-build}"

case "${action}" in
    build)
        echo "--> Compiling SmartShelf C Engine with ${CC}..."
        if ${CC} ${C_FLAGS} "${ENGINE_SOURCES[@]}" -lm -o "${BUILD_DIR}/shelf_engine"; then
            echo "✓ Successfully compiled C engine: ${BUILD_DIR}/shelf_engine"
        else
            echo "✗ Compilation failed for shelf_engine." >&2
            exit 1
        fi
        ;;

    test)
        echo "--> Compiling and running automated C test suite..."
        if ${CC} ${C_FLAGS} "${TEST_SOURCES[@]}" -lm -o "${BUILD_DIR}/test_runner"; then
            echo "✓ Compiled test runner. Running tests..."
            "${BUILD_DIR}/test_runner"
        else
            echo "✗ Compilation failed for test_runner." >&2
            exit 1
        fi
        ;;

    sample)
        "${SCRIPT_DIR}/build.sh" build
        echo "--> Executing shelf_engine with sample JSON payload..."
        cat << 'EOF' | "${BUILD_DIR}/shelf_engine"
{
  "action": "optimize",
  "books": [
    {
      "bookId": "B001",
      "title": "Introduction to Algorithms",
      "author": "Thomas H. Cormen",
      "genre": "Computer Science",
      "borrowCount": 25,
      "popularityScore": 70,
      "availability": "available"
    },
    {
      "bookId": "B002",
      "title": "Operating System Concepts",
      "author": "Abraham Silberschatz",
      "genre": "Computer Science",
      "borrowCount": 18,
      "availability": "available"
    },
    {
      "bookId": "B003",
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "genre": "Computer Science",
      "borrowCount": 25,
      "availability": "available"
    },
    {
      "bookId": "B004",
      "title": "The Great Gatsby",
      "author": "F. Scott Fitzgerald",
      "genre": "Fiction",
      "borrowCount": 42,
      "availability": "available"
    }
  ]
}
EOF
        ;;

    clean)
        echo "--> Cleaning C build artifacts..."
        rm -rf "${BUILD_DIR}/shelf_engine" "${BUILD_DIR}/test_runner" "${BUILD_DIR}"/*.dSYM
        touch "${BUILD_DIR}/.gitkeep"
        echo "✓ Clean complete."
        ;;

    *)
        echo "Usage: $0 [build|test|sample|clean]"
        exit 1
        ;;
esac
