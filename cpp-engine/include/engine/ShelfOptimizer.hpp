#pragma once

#include <vector>
#include <string>
#include <sstream>
#include "nlohmann/json.hpp"
#include "../models/Book.hpp"
#include "../dsa/HashTable.hpp"
#include "../dsa/BST.hpp"
#include "../dsa/QuickSort.hpp"
#include "../dsa/Shelf2DArray.hpp"

namespace SmartShelf {

struct ProposedMove {
    std::string bookId;
    std::string title;
    std::string genre;
    int borrowCount;
    ShelfPosition from;
    ShelfPosition to;
};

inline void to_json(nlohmann::json& j, const ProposedMove& m) {
    j = nlohmann::json{
        {"bookId", m.bookId},
        {"title", m.title},
        {"genre", m.genre},
        {"borrowCount", m.borrowCount},
        {"from", {
            {"shelfPage", m.from.shelfPage},
            {"shelfRow", m.from.shelfRow},
            {"shelfSlot", m.from.shelfSlot}
        }},
        {"to", {
            {"shelfPage", m.to.shelfPage},
            {"shelfRow", m.to.shelfRow},
            {"shelfSlot", m.to.shelfSlot}
        }}
    };
}

class ShelfOptimizer {
public:
    /**
     * Executes the complete multi-DSA shelf optimization pipeline:
     * 1. Validates records and checks for unique book IDs using HashTable.
     * 2. Groups books by genre alphabetically using GenreBST.
     * 3. Sorts books within each genre using custom QuickSort (borrowCount DESC, title ASC).
     * 4. Allocates books to the multi-page 4x5 2D Shelf Array.
     * 5. Generates structured proposal JSON with movements and shelf layouts.
     */
    static nlohmann::json optimizeShelves(const std::vector<Book>& inputBooks) {
        nlohmann::json response;

        // Base case: Empty collection
        if (inputBooks.empty()) {
            Shelf2DArray emptyShelf(0);
            response["success"] = true;
            response["shelfPages"] = emptyShelf.toJson();
            response["assignments"] = nlohmann::json::array();
            response["moves"] = nlohmann::json::array();
            response["metadata"] = {
                {"totalBooks", 0},
                {"totalPages", 1},
                {"totalOccupied", 0},
                {"totalCapacity", Shelf2DArray::SLOTS_PER_PAGE},
                {"emptySlots", Shelf2DArray::SLOTS_PER_PAGE},
                {"genresCount", 0},
                {"eyeLevelBooksCount", 0}
            };
            return response;
        }

        // Step 1: Validation and Duplicate ID Detection using custom HashTable
        HashTable idIndex(127);
        std::vector<Book> validBooks;
        validBooks.reserve(inputBooks.size());

        for (const auto& book : inputBooks) {
            std::string validationError;
            if (!book.isValid(validationError)) {
                response["success"] = false;
                response["error"] = "Validation Error: " + validationError;
                return response;
            }

            // Detect duplicate Book IDs using custom Hash Table
            if (!idIndex.insert(book)) {
                response["success"] = false;
                response["error"] = "Duplicate Book ID detected: '" + book.bookId + "'. Each book must have a unique ID.";
                return response;
            }

            validBooks.push_back(book);
        }

        // Step 2: Categorization via Custom Binary Search Tree
        // GenreBST organizes genres alphabetically and avoids duplicate genre nodes
        GenreBST genreTree;
        for (const auto& book : validBooks) {
            genreTree.insert(book);
        }

        // Step 3: In-Order Traversal + QuickSort within each genre
        // In-Order traversal guarantees deterministic alphabetical genre order
        std::vector<Book> globalOrderedBooks;
        globalOrderedBooks.reserve(validBooks.size());

        genreTree.inOrderTraversal([&globalOrderedBooks](const std::string& /*genre*/, std::vector<Book>& booksInGenre) {
            // Apply custom manual Quick Sort on books within this genre
            QuickSort::sort(booksInGenre);

            // Append sorted books to the global allocation sequence
            for (const auto& b : booksInGenre) {
                globalOrderedBooks.push_back(b);
            }
        });

        // Step 4: Physical Placement into Multi-Page 2D Shelf Array
        // 4 rows x 5 slots per page. Row 1 represents the primary eye-level shelf tier.
        Shelf2DArray shelfGrid(globalOrderedBooks.size());
        std::vector<Book> assignedBooks;
        assignedBooks.reserve(globalOrderedBooks.size());
        std::vector<ProposedMove> proposedMoves;

        int eyeLevelCount = 0;

        for (auto book : globalOrderedBooks) {
            ShelfPosition prevPos{book.shelfPage, book.shelfRow, book.shelfSlot};

            int assignedPage = 0;
            int assignedRow = 0;
            int assignedSlot = 0;

            bool placed = shelfGrid.allocateNextAvailableSlot(book, assignedPage, assignedRow, assignedSlot);
            if (!placed) {
                response["success"] = false;
                response["error"] = "Shelf allocation failure: Unable to place book " + book.bookId;
                return response;
            }

            book.shelfPage = assignedPage;
            book.shelfRow = assignedRow;
            book.shelfSlot = assignedSlot;
            assignedBooks.push_back(book);

            if (assignedRow == 1) {
                ++eyeLevelCount;
            }

            // Track movements if the book previously had a valid assigned position
            if (prevPos.shelfPage > 0 && prevPos.shelfRow > 0 && prevPos.shelfSlot > 0) {
                ShelfPosition newPos{assignedPage, assignedRow, assignedSlot};
                if (!(prevPos == newPos)) {
                    proposedMoves.push_back({
                        book.bookId,
                        book.title,
                        book.genre,
                        book.borrowCount,
                        prevPos,
                        newPos
                    });
                }
            }
        }

        // Step 5: Serialize Output JSON
        response["success"] = true;
        response["shelfPages"] = shelfGrid.toJson();
        response["assignments"] = assignedBooks;
        response["moves"] = proposedMoves;
        response["metadata"] = {
            {"totalBooks", assignedBooks.size()},
            {"totalPages", shelfGrid.getTotalPages()},
            {"totalOccupied", shelfGrid.getTotalOccupied()},
            {"totalCapacity", shelfGrid.getTotalCapacity()},
            {"emptySlots", shelfGrid.getTotalCapacity() - shelfGrid.getTotalOccupied()},
            {"genresCount", genreTree.getGenreCount()},
            {"eyeLevelBooksCount", eyeLevelCount},
            {"rowsPerPage", Shelf2DArray::ROWS_PER_PAGE},
            {"slotsPerRow", Shelf2DArray::SLOTS_PER_ROW},
            {"slotsPerPage", Shelf2DArray::SLOTS_PER_PAGE}
        };

        return response;
    }

    /**
     * O(1) Instant Book ID Lookup via Custom HashTable
     */
    static nlohmann::json searchById(const std::vector<Book>& books, const std::string& bookId) {
        nlohmann::json response;
        HashTable table(127);
        for (const auto& b : books) {
            table.insert(b);
        }

        const Book* found = table.search(bookId);
        if (found != nullptr) {
            response["success"] = true;
            response["found"] = true;
            response["book"] = *found;
        } else {
            response["success"] = true;
            response["found"] = false;
            response["message"] = "Book with ID '" + bookId + "' not found.";
        }
        return response;
    }

    /**
     * Genre Query via Custom Binary Search Tree
     */
    static nlohmann::json searchByGenre(const std::vector<Book>& books, const std::string& genre) {
        nlohmann::json response;
        GenreBST tree;
        for (const auto& b : books) {
            tree.insert(b);
        }

        const std::vector<Book>* matchingBooks = tree.searchGenre(genre);
        if (matchingBooks != nullptr) {
            response["success"] = true;
            response["found"] = true;
            response["genre"] = genre;
            response["total"] = matchingBooks->size();
            response["books"] = *matchingBooks;
        } else {
            response["success"] = true;
            response["found"] = false;
            response["genre"] = genre;
            response["total"] = 0;
            response["books"] = nlohmann::json::array();
            response["message"] = "No books found for genre '" + genre + "'.";
        }
        return response;
    }
};

} // namespace SmartShelf
