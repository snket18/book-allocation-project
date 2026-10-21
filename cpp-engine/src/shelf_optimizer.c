#include "shelf_optimizer.h"
#include "hashtable.h"
#include "bst.h"
#include "quicksort.h"
#include "shelf_2d.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static cJSON* book_to_json(const Book* b) {
    cJSON* obj = cJSON_CreateObject();
    cJSON_AddStringToObject(obj, "bookId", b->bookId);
    cJSON_AddStringToObject(obj, "title", b->title);
    cJSON_AddStringToObject(obj, "author", b->author);
    cJSON_AddStringToObject(obj, "genre", b->genre);
    cJSON_AddNumberToObject(obj, "borrowCount", b->borrowCount);
    cJSON_AddNumberToObject(obj, "popularityScore", b->popularityScore);
    cJSON_AddBoolToObject(obj, "availability", b->availability);
    cJSON_AddNumberToObject(obj, "shelfPage", b->shelfPage);
    cJSON_AddNumberToObject(obj, "shelfRow", b->shelfRow);
    cJSON_AddNumberToObject(obj, "shelfSlot", b->shelfSlot);
    return obj;
}

typedef struct {
    Book* items;
    size_t count;
    size_t capacity;
} OrderedBookList;

static void bst_inorder_collect(const char* genre, Book* genreBooks, size_t count, void* userData) {
    (void)genre;
    OrderedBookList* list = (OrderedBookList*)userData;

    // Apply Quick Sort within this genre (borrow count DESC, title ASC)
    quicksort_sort(genreBooks, count);

    // Append to global sequence
    for (size_t i = 0; i < count; ++i) {
        if (list->count >= list->capacity) {
            size_t newCap = list->capacity * 2 + 8;
            Book* newItems = (Book*)realloc(list->items, newCap * sizeof(Book));
            if (!newItems) return;
            list->items = newItems;
            list->capacity = newCap;
        }
        list->items[list->count++] = genreBooks[i];
    }
}

cJSON* optimize_shelves(const Book* books, size_t count) {
    cJSON* response = cJSON_CreateObject();

    // Base case: Empty collection
    if (!books || count == 0) {
        Shelf2DArray emptyShelf;
        shelf_2d_init(&emptyShelf, 0);

        cJSON_AddBoolToObject(response, "success", true);
        cJSON_AddItemToObject(response, "shelfPages", shelf_2d_to_json(&emptyShelf));
        cJSON_AddItemToObject(response, "assignments", cJSON_CreateArray());
        cJSON_AddItemToObject(response, "moves", cJSON_CreateArray());

        cJSON* meta = cJSON_CreateObject();
        cJSON_AddNumberToObject(meta, "totalBooks", 0);
        cJSON_AddNumberToObject(meta, "totalPages", 1);
        cJSON_AddNumberToObject(meta, "totalOccupied", 0);
        cJSON_AddNumberToObject(meta, "totalCapacity", SLOTS_PER_PAGE);
        cJSON_AddNumberToObject(meta, "emptySlots", SLOTS_PER_PAGE);
        cJSON_AddNumberToObject(meta, "genresCount", 0);
        cJSON_AddNumberToObject(meta, "eyeLevelBooksCount", 0);
        cJSON_AddItemToObject(response, "metadata", meta);

        shelf_2d_free(&emptyShelf);
        return response;
    }

    // Step 1: Validation and duplicate ID detection via Hash Table
    HashTable idTable;
    hashtable_init(&idTable, 127);

    char errorMsg[512];
    for (size_t i = 0; i < count; ++i) {
        if (!is_book_valid(&books[i], errorMsg, sizeof(errorMsg))) {
            cJSON_AddBoolToObject(response, "success", false);
            cJSON_AddStringToObject(response, "error", errorMsg);
            hashtable_free(&idTable);
            return response;
        }

        if (!hashtable_insert(&idTable, &books[i])) {
            cJSON_AddBoolToObject(response, "success", false);
            char dupMsg[256];
            snprintf(dupMsg, sizeof(dupMsg), "Duplicate Book ID detected: '%s'. Each book must have a unique ID.", books[i].bookId);
            cJSON_AddStringToObject(response, "error", dupMsg);
            hashtable_free(&idTable);
            return response;
        }
    }
    hashtable_free(&idTable);

    // Step 2: Categorization via Binary Search Tree (GenreBST)
    GenreBST genreTree;
    bst_init(&genreTree);
    for (size_t i = 0; i < count; ++i) {
        bst_insert(&genreTree, &books[i]);
    }

    // Step 3: In-Order Traversal + QuickSort within each genre
    OrderedBookList globalList;
    globalList.count = 0;
    globalList.capacity = count;
    globalList.items = (Book*)malloc(count * sizeof(Book));

    bst_inorder(&genreTree, bst_inorder_collect, &globalList);

    // Step 4: Physical 2D shelf allocation
    Shelf2DArray shelf;
    shelf_2d_init(&shelf, globalList.count);

    cJSON* assignmentsArray = cJSON_CreateArray();
    cJSON* movesArray = cJSON_CreateArray();
    int eyeLevelCount = 0;

    for (size_t i = 0; i < globalList.count; ++i) {
        Book b = globalList.items[i];
        int prevPage = b.shelfPage;
        int prevRow = b.shelfRow;
        int prevSlot = b.shelfSlot;

        int newPage = 0, newRow = 0, newSlot = 0;
        if (!shelf_2d_allocate_next(&shelf, &b, &newPage, &newRow, &newSlot)) {
            cJSON_Delete(response);
            response = cJSON_CreateObject();
            cJSON_AddBoolToObject(response, "success", false);
            cJSON_AddStringToObject(response, "error", "Failed to allocate physical shelf slot.");
            free(globalList.items);
            bst_free(&genreTree);
            shelf_2d_free(&shelf);
            return response;
        }

        b.shelfPage = newPage;
        b.shelfRow = newRow;
        b.shelfSlot = newSlot;

        if (newRow == 1) {
            eyeLevelCount++;
        }

        cJSON_AddItemToArray(assignmentsArray, book_to_json(&b));

        // Track move if coordinate changed
        if (prevPage > 0 && prevRow > 0 && prevSlot > 0) {
            if (prevPage != newPage || prevRow != newRow || prevSlot != newSlot) {
                cJSON* moveObj = cJSON_CreateObject();
                cJSON_AddStringToObject(moveObj, "bookId", b.bookId);
                cJSON_AddStringToObject(moveObj, "title", b.title);
                cJSON_AddStringToObject(moveObj, "genre", b.genre);
                cJSON_AddNumberToObject(moveObj, "borrowCount", b.borrowCount);

                cJSON* fromObj = cJSON_CreateObject();
                cJSON_AddNumberToObject(fromObj, "shelfPage", prevPage);
                cJSON_AddNumberToObject(fromObj, "shelfRow", prevRow);
                cJSON_AddNumberToObject(fromObj, "shelfSlot", prevSlot);
                cJSON_AddItemToObject(moveObj, "from", fromObj);

                cJSON* toObj = cJSON_CreateObject();
                cJSON_AddNumberToObject(toObj, "shelfPage", newPage);
                cJSON_AddNumberToObject(toObj, "shelfRow", newRow);
                cJSON_AddNumberToObject(toObj, "shelfSlot", newSlot);
                cJSON_AddItemToObject(moveObj, "to", toObj);

                cJSON_AddItemToArray(movesArray, moveObj);
            }
        }
    }

    // Step 5: Serialize Output JSON
    cJSON_AddBoolToObject(response, "success", true);
    cJSON_AddItemToObject(response, "shelfPages", shelf_2d_to_json(&shelf));
    cJSON_AddItemToObject(response, "assignments", assignmentsArray);
    cJSON_AddItemToObject(response, "moves", movesArray);

    cJSON* metadata = cJSON_CreateObject();
    cJSON_AddNumberToObject(metadata, "totalBooks", globalList.count);
    cJSON_AddNumberToObject(metadata, "totalPages", shelf.pageCount);
    cJSON_AddNumberToObject(metadata, "totalOccupied", shelf.occupiedCount);
    cJSON_AddNumberToObject(metadata, "totalCapacity", shelf.pageCount * SLOTS_PER_PAGE);
    cJSON_AddNumberToObject(metadata, "emptySlots", (shelf.pageCount * SLOTS_PER_PAGE) - shelf.occupiedCount);
    cJSON_AddNumberToObject(metadata, "genresCount", genreTree.genreCount);
    cJSON_AddNumberToObject(metadata, "eyeLevelBooksCount", eyeLevelCount);
    cJSON_AddNumberToObject(metadata, "rowsPerPage", SHELF_ROWS);
    cJSON_AddNumberToObject(metadata, "slotsPerRow", SHELF_SLOTS);
    cJSON_AddNumberToObject(metadata, "slotsPerPage", SLOTS_PER_PAGE);
    cJSON_AddItemToObject(response, "metadata", metadata);

    free(globalList.items);
    bst_free(&genreTree);
    shelf_2d_free(&shelf);

    return response;
}

cJSON* search_by_id(const Book* books, size_t count, const char* targetId) {
    cJSON* response = cJSON_CreateObject();

    HashTable table;
    hashtable_init(&table, 127);
    for (size_t i = 0; i < count; ++i) {
        hashtable_insert(&table, &books[i]);
    }

    Book* found = hashtable_search(&table, targetId);
    if (found) {
        cJSON_AddBoolToObject(response, "success", true);
        cJSON_AddBoolToObject(response, "found", true);
        cJSON_AddItemToObject(response, "book", book_to_json(found));
    } else {
        cJSON_AddBoolToObject(response, "success", true);
        cJSON_AddBoolToObject(response, "found", false);
        char msg[256];
        snprintf(msg, sizeof(msg), "Book with ID '%s' not found.", targetId ? targetId : "");
        cJSON_AddStringToObject(response, "message", msg);
    }

    hashtable_free(&table);
    return response;
}

cJSON* search_by_genre(const Book* books, size_t count, const char* targetGenre) {
    cJSON* response = cJSON_CreateObject();

    GenreBST tree;
    bst_init(&tree);
    for (size_t i = 0; i < count; ++i) {
        bst_insert(&tree, &books[i]);
    }

    BSTNode* found = bst_search_genre(&tree, targetGenre);
    if (found && found->bookCount > 0) {
        cJSON_AddBoolToObject(response, "success", true);
        cJSON_AddBoolToObject(response, "found", true);
        cJSON_AddStringToObject(response, "genre", targetGenre);
        cJSON_AddNumberToObject(response, "total", found->bookCount);

        cJSON* booksArray = cJSON_CreateArray();
        for (size_t i = 0; i < found->bookCount; ++i) {
            cJSON_AddItemToArray(booksArray, book_to_json(&found->books[i]));
        }
        cJSON_AddItemToObject(response, "books", booksArray);
    } else {
        cJSON_AddBoolToObject(response, "success", true);
        cJSON_AddBoolToObject(response, "found", false);
        cJSON_AddStringToObject(response, "genre", targetGenre ? targetGenre : "");
        cJSON_AddNumberToObject(response, "total", 0);
        cJSON_AddItemToObject(response, "books", cJSON_CreateArray());
        char msg[256];
        snprintf(msg, sizeof(msg), "No books found for genre '%s'.", targetGenre ? targetGenre : "");
        cJSON_AddStringToObject(response, "message", msg);
    }

    bst_free(&tree);
    return response;
}
