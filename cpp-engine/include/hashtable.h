#pragma once
#ifndef HASHTABLE_H
#define HASHTABLE_H

#ifdef __cplusplus
extern "C" {
#endif

#include "book.h"
#include <stdbool.h>
#include <stddef.h>

#define HASHTABLE_DEFAULT_CAPACITY 127 // Prime number for low clustering

typedef struct HashNode HashNode;

/**
 * Node in separate chaining linked list
 */
struct HashNode {
    Book book;
    HashNode* next;
};

/**
 * Hash Table Structure
 */
typedef struct {
    HashNode** table;
    size_t capacity;
    size_t size;
} HashTable;

/**
 * Initializes hash table with given capacity
 */
void hashtable_init(HashTable* ht, size_t capacity);

/**
 * Frees all memory allocated by hash table
 */
void hashtable_free(HashTable* ht);

/**
 * Inserts book. Returns false if duplicate bookId is found.
 */
bool hashtable_insert(HashTable* ht, const Book* book);

/**
 * Searches book by ID. Returns pointer to Book or NULL if not found.
 */
Book* hashtable_search(const HashTable* ht, const char* bookId);

/**
 * Checks if book ID exists
 */
bool hashtable_contains(const HashTable* ht, const char* bookId);

/**
 * Removes a book by ID. Returns true if removed, false if not found.
 */
bool hashtable_remove(HashTable* ht, const char* bookId);

#ifdef __cplusplus
}
#endif

#endif /* HASHTABLE_H */
