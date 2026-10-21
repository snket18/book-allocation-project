#pragma once
#ifndef BST_H
#define BST_H

#ifdef __cplusplus
extern "C" {
#endif

#include "book.h"
#include <stddef.h>

typedef struct BSTNode BSTNode;

/**
 * Node in Genre Binary Search Tree
 */
struct BSTNode {
    char genre[MAX_STR_LEN];
    Book* books;
    size_t bookCount;
    size_t bookCapacity;
    BSTNode* left;
    BSTNode* right;
};

/**
 * Genre Binary Search Tree
 */
typedef struct {
    BSTNode* root;
    size_t genreCount;
    size_t totalBooks;
} GenreBST;

/**
 * Callback function type for In-Order traversal
 */
typedef void (*BSTInOrderCallback)(const char* genre, Book* books, size_t count, void* userData);

/**
 * Initializes BST
 */
void bst_init(GenreBST* tree);

/**
 * Frees entire BST
 */
void bst_free(GenreBST* tree);

/**
 * Inserts book into tree categorized by book->genre
 */
void bst_insert(GenreBST* tree, const Book* book);

/**
 * Searches for a genre node. Returns pointer to BSTNode or NULL.
 */
BSTNode* bst_search_genre(const GenreBST* tree, const char* genre);

/**
 * Executes In-Order traversal (alphabetical genre order)
 */
void bst_inorder(const GenreBST* tree, BSTInOrderCallback callback, void* userData);

#ifdef __cplusplus
}
#endif

#endif /* BST_H */
