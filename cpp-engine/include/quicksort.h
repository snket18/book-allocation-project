#pragma once
#ifndef QUICKSORT_H
#define QUICKSORT_H

#ifdef __cplusplus
extern "C" {
#endif

#include "book.h"
#include <stdbool.h>
#include <stddef.h>

/**
 * Custom In-Place Quick Sort
 * Sorts an array of Book structs.
 * 
 * Multi-Key Ordering Rule:
 *   1. Primary:   borrowCount in DESCENDING order (highest circulation first)
 *   2. Secondary: title in ASCENDING alphabetical order (tie-breaker)
 */

/**
 * Returns true if book 'a' should precede book 'b'
 */
bool quicksort_compare(const Book* a, const Book* b);

/**
 * Sorts array of books in-place
 */
void quicksort_books(Book* books, int low, int high);

/**
 * Public convenience wrapper
 */
void quicksort_sort(Book* books, size_t count);

#ifdef __cplusplus
}
#endif

#endif /* QUICKSORT_H */
