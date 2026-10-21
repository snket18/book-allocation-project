#include "book.h"
#include <math.h>
#include <stdio.h>
#include <string.h>

int calculate_popularity_score(int borrowCount) {
    if (borrowCount <= 0) return 0;
    // Formula: log2(borrows + 1) * 15, capped at 100
    double score = log2((double)borrowCount + 1.0) * 15.0;
    int rounded = (int)round(score);
    if (rounded < 0) return 0;
    if (rounded > 100) return 100;
    return rounded;
}

bool is_book_valid(const Book* book, char* errorMsg, size_t maxLen) {
    if (!book) {
        snprintf(errorMsg, maxLen, "Book pointer is null.");
        return false;
    }
    if (strlen(book->bookId) == 0) {
        snprintf(errorMsg, maxLen, "Book ID cannot be empty.");
        return false;
    }
    if (strlen(book->title) == 0) {
        snprintf(errorMsg, maxLen, "Book title cannot be empty for ID: %s", book->bookId);
        return false;
    }
    if (strlen(book->genre) == 0) {
        snprintf(errorMsg, maxLen, "Book genre cannot be empty for ID: %s", book->bookId);
        return false;
    }
    if (book->borrowCount < 0) {
        snprintf(errorMsg, maxLen, "Borrow count cannot be negative for ID: %s", book->bookId);
        return false;
    }
    return true;
}
