#pragma once
#ifndef SHELF_2D_H
#define SHELF_2D_H

#ifdef __cplusplus
extern "C" {
#endif

#include "book.h"
#include "cJSON.h"
#include <stdbool.h>
#include <stddef.h>

#define SHELF_ROWS 4
#define SHELF_SLOTS 5
#define SLOTS_PER_PAGE (SHELF_ROWS * SHELF_SLOTS) // 20 slots per page

/**
 * Slot on the physical shelf
 */
typedef struct {
    char bookId[MAX_ID_LEN];
    char title[MAX_STR_LEN];
    char author[MAX_STR_LEN];
    char genre[MAX_STR_LEN];
    int borrowCount;
    int popularityScore;
    bool isOccupied;
} ShelfSlot;

/**
 * A 4x5 2D matrix representing one shelving unit page
 */
typedef struct {
    int pageNumber;
    ShelfSlot grid[SHELF_ROWS][SHELF_SLOTS];
} ShelfPage;

/**
 * Multi-page collection of physical 2D shelves
 */
typedef struct {
    ShelfPage* pages;
    size_t pageCount;
    size_t occupiedCount;
} Shelf2DArray;

/**
 * Initializes a 2D shelf array to hold at least totalBooks positions
 */
void shelf_2d_init(Shelf2DArray* shelf, size_t totalBooks);

/**
 * Frees dynamically allocated pages
 */
void shelf_2d_free(Shelf2DArray* shelf);

/**
 * Allocates the next available slot sequentially (Page 1 -> Row 1..4 -> Slot 1..5)
 * Fills outPage, outRow, outSlot (all 1-indexed)
 */
bool shelf_2d_allocate_next(Shelf2DArray* shelf, const Book* book, int* outPage, int* outRow, int* outSlot);

/**
 * Converts the 2D array into a cJSON array structure for the visualizer
 */
cJSON* shelf_2d_to_json(const Shelf2DArray* shelf);

#ifdef __cplusplus
}
#endif

#endif /* SHELF_2D_H */
