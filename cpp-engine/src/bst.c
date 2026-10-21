#include "bst.h"
#include <stdlib.h>
#include <string.h>

static BSTNode* create_node(const Book* book) {
    BSTNode* node = (BSTNode*)malloc(sizeof(BSTNode));
    if (!node) return NULL;

    strncpy(node->genre, book->genre, MAX_STR_LEN - 1);
    node->genre[MAX_STR_LEN - 1] = '\0';

    node->bookCapacity = 8;
    node->books = (Book*)malloc(node->bookCapacity * sizeof(Book));
    node->books[0] = *book;
    node->bookCount = 1;

    node->left = NULL;
    node->right = NULL;
    return node;
}

static void append_book_to_node(BSTNode* node, const Book* book) {
    if (node->bookCount >= node->bookCapacity) {
        size_t newCap = node->bookCapacity * 2;
        Book* newBooks = (Book*)realloc(node->books, newCap * sizeof(Book));
        if (!newBooks) return;
        node->books = newBooks;
        node->bookCapacity = newCap;
    }
    node->books[node->bookCount++] = *book;
}

static BSTNode* insert_helper(BSTNode* node, const Book* book, size_t* genreCount, size_t* totalBooks) {
    if (!node) {
        (*genreCount)++;
        (*totalBooks)++;
        return create_node(book);
    }

    int cmp = strcmp(book->genre, node->genre);
    if (cmp < 0) {
        node->left = insert_helper(node->left, book, genreCount, totalBooks);
    } else if (cmp > 0) {
        node->right = insert_helper(node->right, book, genreCount, totalBooks);
    } else {
        // Genre already exists: append to existing node (avoid duplicate genre nodes)
        append_book_to_node(node, book);
        (*totalBooks)++;
    }
    return node;
}

void bst_init(GenreBST* tree) {
    if (!tree) return;
    tree->root = NULL;
    tree->genreCount = 0;
    tree->totalBooks = 0;
}

static void destroy_tree(BSTNode* node) {
    if (!node) return;
    destroy_tree(node->left);
    destroy_tree(node->right);
    if (node->books) {
        free(node->books);
        node->books = NULL;
    }
    free(node);
}

void bst_free(GenreBST* tree) {
    if (!tree) return;
    destroy_tree(tree->root);
    tree->root = NULL;
    tree->genreCount = 0;
    tree->totalBooks = 0;
}

void bst_insert(GenreBST* tree, const Book* book) {
    if (!tree || !book || strlen(book->genre) == 0) return;
    tree->root = insert_helper(tree->root, book, &tree->genreCount, &tree->totalBooks);
}

BSTNode* bst_search_genre(const GenreBST* tree, const char* genre) {
    if (!tree || !genre) return NULL;
    BSTNode* curr = tree->root;
    while (curr) {
        int cmp = strcmp(genre, curr->genre);
        if (cmp == 0) return curr;
        if (cmp < 0) curr = curr->left;
        else curr = curr->right;
    }
    return NULL;
}

static void inorder_helper(BSTNode* node, BSTInOrderCallback callback, void* userData) {
    if (!node) return;
    inorder_helper(node->left, callback, userData);
    callback(node->genre, node->books, node->bookCount, userData);
    inorder_helper(node->right, callback, userData);
}

void bst_inorder(const GenreBST* tree, BSTInOrderCallback callback, void* userData) {
    if (!tree || !callback) return;
    inorder_helper(tree->root, callback, userData);
}
