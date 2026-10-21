#pragma once
#ifndef SHELF_OPTIMIZER_H
#define SHELF_OPTIMIZER_H

#ifdef __cplusplus
extern "C" {
#endif

#include "book.h"
#include "cJSON.h"
#include <stddef.h>

/**
 * Runs the complete Multi-DSA optimization pipeline:
 * 1. Validates records and checks unique IDs via Hash Table.
 * 2. Groups books by genre via Binary Search Tree.
 * 3. In-Order traversal guarantees alphabetical genre ordering.
 * 4. In-place Quick Sort ranks books within each genre (borrow count DESC, title ASC).
 * 5. Places books into 2D Multi-Page Shelf Array.
 * 6. Generates full JSON proposal with proposed moves.
 */
cJSON* optimize_shelves(const Book* books, size_t count);

/**
 * O(1) Instant Book ID Lookup via Hash Table
 */
cJSON* search_by_id(const Book* books, size_t count, const char* targetId);

/**
 * Genre Lookup via Binary Search Tree
 */
cJSON* search_by_genre(const Book* books, size_t count, const char* targetGenre);

#ifdef __cplusplus
}
#endif

#endif /* SHELF_OPTIMIZER_H */
