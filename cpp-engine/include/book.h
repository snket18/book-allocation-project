#pragma once
#ifndef BOOK_H
#define BOOK_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdbool.h>
#include <stddef.h>

#define MAX_ID_LEN 64
#define MAX_STR_LEN 256

/**
 * Forward declarations of structs
 */
typedef struct Book Book;
typedef struct ShelfPosition ShelfPosition;

/**
 * Represents a coordinate position on the physical shelves
 */
struct ShelfPosition {
    int shelfPage;
    int shelfRow;
    int shelfSlot;
};

/**
 * Core Book Structure in C
 * Represents a single book in the library collection.
 */
struct Book {
    char bookId[MAX_ID_LEN];
    char title[MAX_STR_LEN];
    char author[MAX_STR_LEN];
    char genre[MAX_STR_LEN];
    int borrowCount;
    int popularityScore;
    bool availability;

    // Physical Shelf Coordinates (1-indexed: Page, Row 1..4, Slot 1..5)
    int shelfPage;
    int shelfRow;
    int shelfSlot;
};

/**
 * Calculates popularity score from borrow count using logarithmic scaling (0 to 100)
 */
int calculate_popularity_score(int borrowCount);

/**
 * Validates required fields: non-empty bookId, title, genre and non-negative borrowCount
 */
bool is_book_valid(const Book* book, char* errorMsg, size_t maxLen);

#ifdef __cplusplus
}
#endif

#endif /* BOOK_H */
