#include "shelf_2d.h"
#include <stdlib.h>
#include <string.h>

static void init_page(ShelfPage* p, int pageNum) {
    p->pageNumber = pageNum;
    for (int r = 0; r < SHELF_ROWS; ++r) {
        for (int s = 0; s < SHELF_SLOTS; ++s) {
            p->grid[r][s].bookId[0] = '\0';
            p->grid[r][s].title[0] = '\0';
            p->grid[r][s].author[0] = '\0';
            p->grid[r][s].genre[0] = '\0';
            p->grid[r][s].borrowCount = 0;
            p->grid[r][s].popularityScore = 0;
            p->grid[r][s].isOccupied = false;
        }
    }
}

void shelf_2d_init(Shelf2DArray* shelf, size_t totalBooks) {
    if (!shelf) return;
    size_t neededPages = (totalBooks == 0) ? 1 : (totalBooks + SLOTS_PER_PAGE - 1) / SLOTS_PER_PAGE;
    if (neededPages == 0) neededPages = 1;

    shelf->pages = (ShelfPage*)malloc(neededPages * sizeof(ShelfPage));
    shelf->pageCount = neededPages;
    shelf->occupiedCount = 0;

    for (size_t i = 0; i < neededPages; ++i) {
        init_page(&shelf->pages[i], (int)(i + 1));
    }
}

void shelf_2d_free(Shelf2DArray* shelf) {
    if (!shelf) return;
    if (shelf->pages) {
        free(shelf->pages);
        shelf->pages = NULL;
    }
    shelf->pageCount = 0;
    shelf->occupiedCount = 0;
}

static void ensure_pages(Shelf2DArray* shelf, size_t numPages) {
    if (shelf->pageCount >= numPages) return;

    ShelfPage* newPages = (ShelfPage*)realloc(shelf->pages, numPages * sizeof(ShelfPage));
    if (!newPages) return;

    shelf->pages = newPages;
    for (size_t i = shelf->pageCount; i < numPages; ++i) {
        init_page(&shelf->pages[i], (int)(i + 1));
    }
    shelf->pageCount = numPages;
}

bool shelf_2d_allocate_next(Shelf2DArray* shelf, const Book* book, int* outPage, int* outRow, int* outSlot) {
    if (!shelf || !book || !outPage || !outRow || !outSlot) return false;

    size_t slotIdx = shelf->occupiedCount;
    int page = (int)(slotIdx / SLOTS_PER_PAGE) + 1;
    int rem = (int)(slotIdx % SLOTS_PER_PAGE);
    int row = (rem / SHELF_SLOTS) + 1;
    int slot = (rem % SHELF_SLOTS) + 1;

    ensure_pages(shelf, (size_t)page);

    ShelfSlot* target = &shelf->pages[page - 1].grid[row - 1][slot - 1];
    if (target->isOccupied) {
        return false; // Collision prevention
    }

    strncpy(target->bookId, book->bookId, MAX_ID_LEN - 1);
    target->bookId[MAX_ID_LEN - 1] = '\0';
    strncpy(target->title, book->title, MAX_STR_LEN - 1);
    target->title[MAX_STR_LEN - 1] = '\0';
    strncpy(target->author, book->author, MAX_STR_LEN - 1);
    target->author[MAX_STR_LEN - 1] = '\0';
    strncpy(target->genre, book->genre, MAX_STR_LEN - 1);
    target->genre[MAX_STR_LEN - 1] = '\0';

    target->borrowCount = book->borrowCount;
    target->popularityScore = book->popularityScore;
    target->isOccupied = true;
    shelf->occupiedCount++;

    *outPage = page;
    *outRow = row;
    *outSlot = slot;
    return true;
}

cJSON* shelf_2d_to_json(const Shelf2DArray* shelf) {
    cJSON* pagesArray = cJSON_CreateArray();
    if (!shelf) return pagesArray;

    for (size_t p = 0; p < shelf->pageCount; ++p) {
        cJSON* pageObj = cJSON_CreateObject();
        cJSON_AddNumberToObject(pageObj, "page", shelf->pages[p].pageNumber);
        cJSON_AddNumberToObject(pageObj, "rows", SHELF_ROWS);
        cJSON_AddNumberToObject(pageObj, "slotsPerRow", SHELF_SLOTS);

        cJSON* slotsArray = cJSON_CreateArray();
        for (int r = 0; r < SHELF_ROWS; ++r) {
            for (int s = 0; s < SHELF_SLOTS; ++s) {
                const ShelfSlot* slot = &shelf->pages[p].grid[r][s];
                cJSON* slotObj = cJSON_CreateObject();
                cJSON_AddNumberToObject(slotObj, "row", r + 1);
                cJSON_AddNumberToObject(slotObj, "slot", s + 1);
                cJSON_AddBoolToObject(slotObj, "isOccupied", slot->isOccupied);

                if (slot->isOccupied) {
                    cJSON_AddStringToObject(slotObj, "bookId", slot->bookId);
                    cJSON_AddStringToObject(slotObj, "title", slot->title);
                    cJSON_AddStringToObject(slotObj, "author", slot->author);
                    cJSON_AddStringToObject(slotObj, "genre", slot->genre);
                    cJSON_AddNumberToObject(slotObj, "borrowCount", slot->borrowCount);
                    cJSON_AddNumberToObject(slotObj, "popularityScore", slot->popularityScore);
                } else {
                    cJSON_AddNullToObject(slotObj, "bookId");
                }
                cJSON_AddItemToArray(slotsArray, slotObj);
            }
        }
        cJSON_AddItemToObject(pageObj, "slots", slotsArray);
        cJSON_AddItemToArray(pagesArray, pageObj);
    }

    return pagesArray;
}
