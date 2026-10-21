#include "hashtable.h"
#include <stdlib.h>
#include <string.h>

/**
 * DJB2 Hash algorithm for string keys
 */
static size_t hash_djb2(const char* str, size_t capacity) {
    unsigned long hash = 5381;
    int c;
    while ((c = (unsigned char)*str++)) {
        hash = ((hash << 5) + hash) + c; // hash * 33 + c
    }
    return (size_t)(hash % capacity);
}

void hashtable_init(HashTable* ht, size_t capacity) {
    if (!ht) return;
    ht->capacity = (capacity > 0) ? capacity : HASHTABLE_DEFAULT_CAPACITY;
    ht->size = 0;
    ht->table = (HashNode**)calloc(ht->capacity, sizeof(HashNode*));
}

void hashtable_free(HashTable* ht) {
    if (!ht || !ht->table) return;
    for (size_t i = 0; i < ht->capacity; ++i) {
        HashNode* curr = ht->table[i];
        while (curr) {
            HashNode* temp = curr;
            curr = curr->next;
            free(temp);
        }
        ht->table[i] = NULL;
    }
    free(ht->table);
    ht->table = NULL;
    ht->size = 0;
    ht->capacity = 0;
}

bool hashtable_insert(HashTable* ht, const Book* book) {
    if (!ht || !book || strlen(book->bookId) == 0) return false;

    size_t index = hash_djb2(book->bookId, ht->capacity);
    HashNode* curr = ht->table[index];

    // Check for duplicate key
    while (curr) {
        if (strcmp(curr->book.bookId, book->bookId) == 0) {
            return false; // Duplicate detected
        }
        curr = curr->next;
    }

    // Insert at head of bucket linked list (O(1) insertion)
    HashNode* newNode = (HashNode*)malloc(sizeof(HashNode));
    if (!newNode) return false;

    newNode->book = *book;
    newNode->next = ht->table[index];
    ht->table[index] = newNode;
    ht->size++;
    return true;
}

Book* hashtable_search(const HashTable* ht, const char* bookId) {
    if (!ht || !ht->table || !bookId || strlen(bookId) == 0) return NULL;

    size_t index = hash_djb2(bookId, ht->capacity);
    HashNode* curr = ht->table[index];

    while (curr) {
        if (strcmp(curr->book.bookId, bookId) == 0) {
            return &curr->book;
        }
        curr = curr->next;
    }
    return NULL;
}

bool hashtable_contains(const HashTable* ht, const char* bookId) {
    return hashtable_search(ht, bookId) != NULL;
}

bool hashtable_remove(HashTable* ht, const char* bookId) {
    if (!ht || !ht->table || !bookId || strlen(bookId) == 0) return false;

    size_t index = hash_djb2(bookId, ht->capacity);
    HashNode* curr = ht->table[index];
    HashNode* prev = NULL;

    while (curr) {
        if (strcmp(curr->book.bookId, bookId) == 0) {
            if (!prev) {
                ht->table[index] = curr->next;
            } else {
                prev->next = curr->next;
            }
            free(curr);
            ht->size--;
            return true;
        }
        prev = curr;
        curr = curr->next;
    }
    return false;
}
