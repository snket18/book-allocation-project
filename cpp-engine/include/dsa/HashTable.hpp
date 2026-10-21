#pragma once

#include <string>
#include <vector>
#include <cstddef>
#include "../models/Book.hpp"

namespace SmartShelf {

/**
 * ============================================================================
 * DSA COMPONENT: Custom Hash Table with Separate Chaining
 * ============================================================================
 * 
 * Purpose:
 *   Provides O(1) average-time lookups, insertions, updates, and deletions
 *   for books indexed by their unique bookId (e.g. barcode / RFID scans).
 * 
 * Collision Resolution Strategy:
 *   Separate Chaining. Each bucket in the table contains a singly-linked list
 *   of HashNode structures. When two keys produce the same hash index, the new
 *   node is appended/prepended to that bucket's list.
 * 
 * Hash Function:
 *   DJB2 (Daniel J. Bernstein) hash algorithm.
 *   Iteratively computes: hash = ((hash << 5) + hash) + c
 *   Provides excellent bit-distribution across string keys with low collision rates.
 * 
 * Complexity Analysis:
 *   - Search:
 *       Average Case: O(1 + alpha), where alpha = N / M (load factor).
 *       Worst Case:   O(N), occurs if all keys produce identical hash values
 *                     and degrade the bucket into a single linear linked list.
 *   - Insertion:
 *       Average Case: O(1)
 *       Worst Case:   O(N) (verifying key uniqueness across a degenerate bucket)
 *   - Deletion:
 *       Average Case: O(1)
 *       Worst Case:   O(N)
 *   - Space Complexity: O(M + N), where M = number of buckets, N = total books.
 * ============================================================================
 */
class HashTable {
private:
    struct HashNode {
        Book book;
        HashNode* next;

        HashNode(const Book& b, HashNode* nxt = nullptr)
            : book(b), next(nxt) {}
    };

    static constexpr size_t DEFAULT_CAPACITY = 101; // Prime number reduces clustering
    size_t capacity_;
    size_t size_;
    std::vector<HashNode*> table_;

    // DJB2 Hash function for string keys
    size_t hashFunction(const std::string& key) const {
        unsigned long hash = 5381;
        for (char c : key) {
            hash = ((hash << 5) + hash) + static_cast<unsigned char>(c); // hash * 33 + c
        }
        return hash % capacity_;
    }

public:
    explicit HashTable(size_t capacity = DEFAULT_CAPACITY)
        : capacity_(capacity > 0 ? capacity : DEFAULT_CAPACITY),
          size_(0),
          table_(capacity_, nullptr) {}

    ~HashTable() {
        clear();
    }

    // Disable copy to avoid accidental shallow pointer copies
    HashTable(const HashTable&) = delete;
    HashTable& operator=(const HashTable&) = delete;

    // Clear and free all allocated nodes
    void clear() {
        for (size_t i = 0; i < capacity_; ++i) {
            HashNode* current = table_[i];
            while (current != nullptr) {
                HashNode* temp = current;
                current = current->next;
                delete temp;
            }
            table_[i] = nullptr;
        }
        size_ = 0;
    }

    // Insert a book. Returns false if a book with the same bookId already exists.
    bool insert(const Book& book) {
        if (book.bookId.empty()) return false;

        size_t index = hashFunction(book.bookId);
        HashNode* current = table_[index];

        // Check if key already exists
        while (current != nullptr) {
            if (current->book.bookId == book.bookId) {
                return false; // Duplicate bookId detected
            }
            current = current->next;
        }

        // Insert at the front of the bucket list (O(1) insertion)
        HashNode* newNode = new HashNode(book, table_[index]);
        table_[index] = newNode;
        ++size_;
        return true;
    }

    // Search by bookId. Returns pointer to Book or nullptr if not found.
    Book* search(const std::string& bookId) {
        if (bookId.empty()) return nullptr;
        size_t index = hashFunction(bookId);
        HashNode* current = table_[index];

        while (current != nullptr) {
            if (current->book.bookId == bookId) {
                return &(current->book);
            }
            current = current->next;
        }
        return nullptr;
    }

    const Book* search(const std::string& bookId) const {
        if (bookId.empty()) return nullptr;
        size_t index = hashFunction(bookId);
        HashNode* current = table_[index];

        while (current != nullptr) {
            if (current->book.bookId == bookId) {
                return &(current->book);
            }
            current = current->next;
        }
        return nullptr;
    }

    // Update book details. Returns true if book existed and was updated.
    bool update(const Book& book) {
        Book* existing = search(book.bookId);
        if (existing == nullptr) return false;
        *existing = book;
        return true;
    }

    // Delete a book by bookId. Returns true if removed, false if not found.
    bool remove(const std::string& bookId) {
        if (bookId.empty()) return false;
        size_t index = hashFunction(bookId);
        HashNode* current = table_[index];
        HashNode* prev = nullptr;

        while (current != nullptr) {
            if (current->book.bookId == bookId) {
                if (prev == nullptr) {
                    table_[index] = current->next;
                } else {
                    prev->next = current->next;
                }
                delete current;
                --size_;
                return true;
            }
            prev = current;
            current = current->next;
        }
        return false;
    }

    bool contains(const std::string& bookId) const {
        return search(bookId) != nullptr;
    }

    size_t size() const {
        return size_;
    }

    bool empty() const {
        return size_ == 0;
    }

    // Retrieve all books stored in the table
    std::vector<Book> getAll() const {
        std::vector<Book> books;
        books.reserve(size_);
        for (size_t i = 0; i < capacity_; ++i) {
            HashNode* current = table_[i];
            while (current != nullptr) {
                books.push_back(current->book);
                current = current->next;
            }
        }
        return books;
    }

    // Diagnostic method to inspect collision chaining
    size_t getBucketChainLength(size_t index) const {
        if (index >= capacity_) return 0;
        size_t len = 0;
        HashNode* current = table_[index];
        while (current != nullptr) {
            ++len;
            current = current->next;
        }
        return len;
    }

    size_t getCapacity() const {
        return capacity_;
    }
};

} // namespace SmartShelf
