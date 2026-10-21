#pragma once

#include <string>
#include <vector>
#include <functional>
#include <algorithm>
#include "../models/Book.hpp"

namespace SmartShelf {

/**
 * ============================================================================
 * DSA COMPONENT: Custom Binary Search Tree (BST) for Genre Organization
 * ============================================================================
 * 
 * Purpose:
 *   Organizes distinct library genres and categories in strict alphabetical order.
 *   Provides fast genre-based querying and yields an ordered alphabetical
 *   sequence of categories through In-Order traversal (Left -> Root -> Right).
 * 
 * Handling Duplicate Genres:
 *   Instead of creating duplicate nodes with the same genre string, each BST node
 *   maintains a collection (std::vector<Book>) of all books belonging to that
 *   specific genre. If a book with an existing genre is inserted, it is appended
 *   to the existing genre node.
 * 
 * Complexity Analysis:
 *   - Search & Insertion:
 *       Average Case: O(log K), where K = number of unique genres, assuming the
 *                     tree is reasonably balanced.
 *       Worst Case:   O(K), occurs when genres are inserted in pre-sorted or
 *                     reverse-sorted order, degenerating the BST into a linked list.
 *   - In-Order Traversal:
 *       O(K), visits every genre node exactly once in alphabetical order.
 *   - Space Complexity:
 *       O(K) for BST nodes + total books storage.
 * ============================================================================
 */
class GenreBST {
public:
    struct BSTNode {
        std::string genre;
        std::vector<Book> books;
        BSTNode* left;
        BSTNode* right;

        explicit BSTNode(const std::string& g)
            : genre(g), left(nullptr), right(nullptr) {}
    };

private:
    BSTNode* root_;
    size_t genreCount_;
    size_t totalBooksCount_;

    // Recursive helper to insert a book into the BST
    BSTNode* insertHelper(BSTNode* node, const Book& book) {
        if (node == nullptr) {
            BSTNode* newNode = new BSTNode(book.genre);
            newNode->books.push_back(book);
            ++genreCount_;
            ++totalBooksCount_;
            return newNode;
        }

        // Case-sensitive or exact string comparison determines branch
        if (book.genre < node->genre) {
            node->left = insertHelper(node->left, book);
        } else if (book.genre > node->genre) {
            node->right = insertHelper(node->right, book);
        } else {
            // Duplicate genre found: append book to existing node (avoid duplicate nodes)
            node->books.push_back(book);
            ++totalBooksCount_;
        }
        return node;
    }

    // Recursive search helper
    const BSTNode* searchHelper(const BSTNode* node, const std::string& genre) const {
        if (node == nullptr) return nullptr;
        if (genre == node->genre) return node;
        if (genre < node->genre) return searchHelper(node->left, genre);
        return searchHelper(node->right, genre);
    }

    BSTNode* searchHelper(BSTNode* node, const std::string& genre) {
        if (node == nullptr) return nullptr;
        if (genre == node->genre) return node;
        if (genre < node->genre) return searchHelper(node->left, genre);
        return searchHelper(node->right, genre);
    }

    // Recursive In-Order traversal (Left -> Current -> Right)
    void inOrderHelper(BSTNode* node,
                       const std::function<void(const std::string&, std::vector<Book>&)>& visitor) {
        if (node == nullptr) return;
        inOrderHelper(node->left, visitor);
        visitor(node->genre, node->books);
        inOrderHelper(node->right, visitor);
    }

    void inOrderConstHelper(const BSTNode* node,
                            const std::function<void(const std::string&, const std::vector<Book>&)>& visitor) const {
        if (node == nullptr) return;
        inOrderConstHelper(node->left, visitor);
        visitor(node->genre, node->books);
        inOrderConstHelper(node->right, visitor);
    }

    // Post-Order cleanup helper (deletes children before parent)
    void destroyTree(BSTNode* node) {
        if (node == nullptr) return;
        destroyTree(node->left);
        destroyTree(node->right);
        delete node;
    }

public:
    GenreBST() : root_(nullptr), genreCount_(0), totalBooksCount_(0) {}

    ~GenreBST() {
        clear();
    }

    // Disable copying
    GenreBST(const GenreBST&) = delete;
    GenreBST& operator=(const GenreBST&) = delete;

    void clear() {
        destroyTree(root_);
        root_ = nullptr;
        genreCount_ = 0;
        totalBooksCount_ = 0;
    }

    // Insert a book into the tree categorized by book.genre
    void insert(const Book& book) {
        if (book.genre.empty()) return;
        root_ = insertHelper(root_, book);
    }

    // Search for a genre and retrieve its books
    const std::vector<Book>* searchGenre(const std::string& genre) const {
        const BSTNode* node = searchHelper(root_, genre);
        if (node != nullptr) {
            return &(node->books);
        }
        return nullptr;
    }

    std::vector<Book>* searchGenre(const std::string& genre) {
        BSTNode* node = searchHelper(root_, genre);
        if (node != nullptr) {
            return &(node->books);
        }
        return nullptr;
    }

    bool containsGenre(const std::string& genre) const {
        return searchHelper(root_, genre) != nullptr;
    }

    // Execute In-Order traversal (guarantees alphabetical genre visit)
    void inOrderTraversal(const std::function<void(const std::string&, std::vector<Book>&)>& visitor) {
        inOrderHelper(root_, visitor);
    }

    void inOrderTraversal(const std::function<void(const std::string&, const std::vector<Book>&)>& visitor) const {
        inOrderConstHelper(root_, visitor);
    }

    // Collect all genre names in sorted alphabetical order
    std::vector<std::string> getSortedGenres() const {
        std::vector<std::string> genres;
        genres.reserve(genreCount_);
        inOrderTraversal([&genres](const std::string& g, const std::vector<Book>&) {
            genres.push_back(g);
        });
        return genres;
    }

    size_t getGenreCount() const {
        return genreCount_;
    }

    size_t getTotalBooksCount() const {
        return totalBooksCount_;
    }

    bool empty() const {
        return root_ == nullptr;
    }
};

} // namespace SmartShelf
