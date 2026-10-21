#include "book.h"
#include "cJSON.h"
#include "shelf_optimizer.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define INITIAL_BUFFER_SIZE 65536 // 64 KB

/**
 * Reads all input from standard input into a dynamically allocated string
 */
static char* read_all_stdin(size_t* outLength) {
    size_t capacity = INITIAL_BUFFER_SIZE;
    size_t length = 0;
    char* buffer = (char*)malloc(capacity);
    if (!buffer) return NULL;

    size_t bytesRead = 0;
    while ((bytesRead = fread(buffer + length, 1, capacity - length - 1, stdin)) > 0) {
        length += bytesRead;
        if (capacity - length <= 1024) {
            capacity *= 2;
            char* newBuffer = (char*)realloc(buffer, capacity);
            if (!newBuffer) {
                free(buffer);
                return NULL;
            }
            buffer = newBuffer;
        }
    }
    buffer[length] = '\0';
    if (outLength) *outLength = length;
    return buffer;
}

static void parse_book_json(cJSON* item, Book* b) {
    memset(b, 0, sizeof(Book));

    cJSON* id = cJSON_GetObjectItemCaseSensitive(item, "bookId");
    if (cJSON_IsString(id) && id->valuestring) {
        strncpy(b->bookId, id->valuestring, MAX_ID_LEN - 1);
    }

    cJSON* title = cJSON_GetObjectItemCaseSensitive(item, "title");
    if (cJSON_IsString(title) && title->valuestring) {
        strncpy(b->title, title->valuestring, MAX_STR_LEN - 1);
    }

    cJSON* author = cJSON_GetObjectItemCaseSensitive(item, "author");
    if (cJSON_IsString(author) && author->valuestring) {
        strncpy(b->author, author->valuestring, MAX_STR_LEN - 1);
    } else {
        strcpy(b->author, "Unknown Author");
    }

    cJSON* genre = cJSON_GetObjectItemCaseSensitive(item, "genre");
    if (cJSON_IsString(genre) && genre->valuestring) {
        strncpy(b->genre, genre->valuestring, MAX_STR_LEN - 1);
    } else {
        strcpy(b->genre, "General");
    }

    cJSON* borrows = cJSON_GetObjectItemCaseSensitive(item, "borrowCount");
    if (cJSON_IsNumber(borrows)) {
        b->borrowCount = (int)borrows->valuedouble;
    }

    cJSON* pop = cJSON_GetObjectItemCaseSensitive(item, "popularityScore");
    if (cJSON_IsNumber(pop) && pop->valuedouble > 0) {
        b->popularityScore = (int)pop->valuedouble;
    } else {
        b->popularityScore = calculate_popularity_score(b->borrowCount);
    }

    cJSON* avail = cJSON_GetObjectItemCaseSensitive(item, "availability");
    if (cJSON_IsBool(avail)) {
        b->availability = cJSON_IsTrue(avail);
    } else if (cJSON_IsString(avail) && avail->valuestring) {
        b->availability = (strcmp(avail->valuestring, "available") == 0 ||
                           strcmp(avail->valuestring, "true") == 0 ||
                           strcmp(avail->valuestring, "1") == 0);
    } else {
        b->availability = true;
    }

    cJSON* page = cJSON_GetObjectItemCaseSensitive(item, "shelfPage");
    if (cJSON_IsNumber(page)) b->shelfPage = (int)page->valuedouble;

    cJSON* row = cJSON_GetObjectItemCaseSensitive(item, "shelfRow");
    if (cJSON_IsNumber(row)) b->shelfRow = (int)row->valuedouble;

    cJSON* slot = cJSON_GetObjectItemCaseSensitive(item, "shelfSlot");
    if (cJSON_IsNumber(slot)) b->shelfSlot = (int)slot->valuedouble;
}

int main(void) {
    size_t inputLen = 0;
    char* inputJsonStr = read_all_stdin(&inputLen);
    if (!inputJsonStr || inputLen == 0) {
        fprintf(stderr, "[ShelfEngine ERROR] Empty stdin input\n");
        cJSON* err = cJSON_CreateObject();
        cJSON_AddBoolToObject(err, "success", false);
        cJSON_AddStringToObject(err, "error", "Empty or missing input JSON.");
        char* out = cJSON_PrintUnformatted(err);
        printf("%s\n", out);
        free(out);
        cJSON_Delete(err);
        if (inputJsonStr) free(inputJsonStr);
        return 1;
    }

    cJSON* requestJson = cJSON_Parse(inputJsonStr);
    free(inputJsonStr);

    if (!requestJson) {
        fprintf(stderr, "[ShelfEngine ERROR] Malformed JSON input\n");
        cJSON* err = cJSON_CreateObject();
        cJSON_AddBoolToObject(err, "success", false);
        cJSON_AddStringToObject(err, "error", "Malformed JSON input.");
        char* out = cJSON_PrintUnformatted(err);
        printf("%s\n", out);
        free(out);
        cJSON_Delete(err);
        return 1;
    }

    cJSON* actionItem = cJSON_GetObjectItemCaseSensitive(requestJson, "action");
    const char* action = (cJSON_IsString(actionItem) && actionItem->valuestring) ? actionItem->valuestring : "optimize";
    fprintf(stderr, "[ShelfEngine INFO] Received action: '%s'\n", action);

    // 1. Health check ping
    if (strcmp(action, "ping") == 0) {
        cJSON* pingRes = cJSON_CreateObject();
        cJSON_AddBoolToObject(pingRes, "success", true);
        cJSON_AddStringToObject(pingRes, "status", "ready");
        cJSON_AddStringToObject(pingRes, "engine", "SmartShelf C DSA Engine");
        cJSON_AddStringToObject(pingRes, "version", "1.0.0");
        char* out = cJSON_PrintUnformatted(pingRes);
        printf("%s\n", out);
        free(out);
        cJSON_Delete(pingRes);
        cJSON_Delete(requestJson);
        return 0;
    }

    // 2. Validate books array
    cJSON* booksItem = cJSON_GetObjectItemCaseSensitive(requestJson, "books");
    if (!cJSON_IsArray(booksItem)) {
        fprintf(stderr, "[ShelfEngine ERROR] Missing or invalid 'books' array in payload\n");
        cJSON* err = cJSON_CreateObject();
        cJSON_AddBoolToObject(err, "success", false);
        cJSON_AddStringToObject(err, "error", "Request payload must contain a 'books' array.");
        char* out = cJSON_PrintUnformatted(err);
        printf("%s\n", out);
        free(out);
        cJSON_Delete(err);
        cJSON_Delete(requestJson);
        return 1;
    }

    int bookCount = cJSON_GetArraySize(booksItem);
    Book* books = (Book*)malloc((size_t)bookCount * sizeof(Book));
    for (int i = 0; i < bookCount; ++i) {
        cJSON* bJson = cJSON_GetArrayItem(booksItem, i);
        parse_book_json(bJson, &books[i]);
    }

    fprintf(stderr, "[ShelfEngine INFO] Successfully parsed %d book records\n", bookCount);

    cJSON* result = NULL;

    // 3. Dispatch requested action
    if (strcmp(action, "optimize") == 0) {
        result = optimize_shelves(books, (size_t)bookCount);
    } else if (strcmp(action, "search_id") == 0) {
        cJSON* idItem = cJSON_GetObjectItemCaseSensitive(requestJson, "bookId");
        const char* targetId = (cJSON_IsString(idItem) && idItem->valuestring) ? idItem->valuestring : "";
        if (strlen(targetId) == 0) {
            result = cJSON_CreateObject();
            cJSON_AddBoolToObject(result, "success", false);
            cJSON_AddStringToObject(result, "error", "Action 'search_id' requires a non-empty 'bookId' field.");
        } else {
            result = search_by_id(books, (size_t)bookCount, targetId);
        }
    } else if (strcmp(action, "search_genre") == 0) {
        cJSON* genreItem = cJSON_GetObjectItemCaseSensitive(requestJson, "genre");
        const char* targetGenre = (cJSON_IsString(genreItem) && genreItem->valuestring) ? genreItem->valuestring : "";
        if (strlen(targetGenre) == 0) {
            result = cJSON_CreateObject();
            cJSON_AddBoolToObject(result, "success", false);
            cJSON_AddStringToObject(result, "error", "Action 'search_genre' requires a non-empty 'genre' field.");
        } else {
            result = search_by_genre(books, (size_t)bookCount, targetGenre);
        }
    } else {
        fprintf(stderr, "[ShelfEngine ERROR] Unknown action: %s\n", action);
        result = cJSON_CreateObject();
        cJSON_AddBoolToObject(result, "success", false);
        cJSON_AddStringToObject(result, "error", "Unknown action. Supported actions: 'optimize', 'search_id', 'search_genre', 'ping'.");
    }

    // Print exactly one JSON line to stdout
    char* finalOutput = cJSON_PrintUnformatted(result);
    printf("%s\n", finalOutput);
    fflush(stdout);

    free(finalOutput);
    cJSON_Delete(result);
    cJSON_Delete(requestJson);
    free(books);

    return 0;
}
