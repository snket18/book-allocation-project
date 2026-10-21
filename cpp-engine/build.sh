#!/usr/bin/env bash
# ==============================================================================
# Smart Library C++ Engine Build & Test Script for macOS / Linux
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
INCLUDE_DIR="${SCRIPT_DIR}/include"
SRC_DIR="${SCRIPT_DIR}/src"
TESTS_DIR="${SCRIPT_DIR}/tests"

# Detect C++ compiler (clang++ on macOS default, fallback to g++)
if command -v clang++ >/dev/null 2>&1; then
    CXX="clang++"
elif command -v g++ >/dev/null 2>&1; then
    CXX="g++"
else
    echo "ERROR: Neither clang++ nor g++ compiler found on this system." >&2
    exit 1
fi

CXX_FLAGS="-std=c++17 -O2 -Wall -Wextra -pedantic -I${INCLUDE_DIR}"

mkdir -p "${BUILD_DIR}"

action="${1:-build}"

case "${action}" in
    build)
        echo "--> Compiling SmartShelf C++ Engine with ${CXX}..."
        if ${CXX} ${CXX_FLAGS} "${SRC_DIR}/main.cpp" -o "${BUILD_DIR}/shelf_engine"; then
            echo "✓ Successfully compiled: ${BUILD_DIR}/shelf_engine"
        else
            echo "✗ Compilation failed for shelf_engine." >&2
            exit 1
        fi
        ;;

    test)
        echo "--> Compiling and running automated C++ test suite..."
        if ${CXX} ${CXX_FLAGS} "${TESTS_DIR}/test_runner.cpp" -o "${BUILD_DIR}/test_runner"; then
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
        echo "--> Cleaning C++ build artifacts..."
        rm -rf "${BUILD_DIR}/shelf_engine" "${BUILD_DIR}/test_runner" "${BUILD_DIR}"/*.dSYM
        touch "${BUILD_DIR}/.gitkeep"
        echo "✓ Clean complete."
        ;;

    *)
        echo "Usage: $0 [build|test|sample|clean]"
        exit 1
        ;;
esac
