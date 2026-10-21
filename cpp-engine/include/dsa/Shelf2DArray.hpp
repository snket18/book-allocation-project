#pragma once

#include <vector>
#include <string>
#include <stdexcept>
#include "nlohmann/json.hpp"
#include "../models/Book.hpp"

namespace SmartShelf {

/**
 * ============================================================================
 * DSA COMPONENT: Multi-Page Two-Dimensional Shelf Array
 * ============================================================================
 * 
 * Purpose:
 *   Models physical library shelving units.
 *   Each physical shelf unit (or "Page") is organized as a 2D matrix of 4 rows by 5 slots.
 *   - 4 rows × 5 slots = 20 book positions per page.
 *   - Row 1 represents the prime "eye-level" shelf tier for this prototype,
 *     which provides the most effortless physical ergonomics for visitors.
 * 
 * Shelf Coordinate System (1-indexed for human readability):
 *   - page: 1, 2, 3, ... (totalPages = ceil(totalBooks / 20), minimum 1 page)
 *   - row:  1 to 4 (Row 1 = Top / Eye-Level, Row 4 = Bottom)
 *   - slot: 1 to 5 (Left to Right along the shelf)
 * 
 * Invariants & Guarantees:
 *   - Strict collision prevention: No two books may occupy the same (page, row, slot).
 *   - Unoccupied slots are represented by an explicit empty marker ("").
 * 
 * Complexity Analysis:
 *   - Coordinate Lookup / Placement: O(1) direct array indexing.
 *   - Space Complexity: O(P × 4 × 5) = O(P), where P = number of pages.
 * ============================================================================
 */
class Shelf2DArray {
public:
    static constexpr int ROWS_PER_PAGE = 4;
    static constexpr int SLOTS_PER_ROW = 5;
    static constexpr int SLOTS_PER_PAGE = ROWS_PER_PAGE * SLOTS_PER_ROW; // 20
    static constexpr const char* EMPTY_MARKER = "";

    struct Slot {
        std::string bookId{EMPTY_MARKER};
        std::string title;
        std::string author;
        std::string genre;
        int borrowCount{0};
        int popularityScore{0};
        bool isOccupied{false};
    };

    struct Page {
        int pageNumber{1};
        Slot grid[ROWS_PER_PAGE][SLOTS_PER_ROW];

        explicit Page(int pNum) : pageNumber(pNum) {
            for (int r = 0; r < ROWS_PER_PAGE; ++r) {
                for (int s = 0; s < SLOTS_PER_ROW; ++s) {
                    grid[r][s].bookId = EMPTY_MARKER;
                    grid[r][s].isOccupied = false;
                }
            }
        }
    };

private:
    std::vector<Page> pages_;
    size_t occupiedCount_{0};

    // Validates 1-indexed coordinates
    bool isValidCoordinate(int page, int row, int slot) const {
        return (page >= 1 && page <= static_cast<int>(pages_.size()) &&
                row >= 1 && row <= ROWS_PER_PAGE &&
                slot >= 1 && slot <= SLOTS_PER_ROW);
    }

public:
    explicit Shelf2DArray(size_t totalBooks = 0) {
        size_t requiredPages = (totalBooks == 0) ? 1 : (totalBooks + SLOTS_PER_PAGE - 1) / SLOTS_PER_PAGE;
        if (requiredPages == 0) requiredPages = 1;
        ensurePages(requiredPages);
    }

    void ensurePages(size_t numPages) {
        while (pages_.size() < numPages) {
            pages_.emplace_back(static_cast<int>(pages_.size()) + 1);
        }
    }

    void clear() {
        pages_.clear();
        occupiedCount_ = 0;
        pages_.emplace_back(1); // Keep at least page 1
    }

    // Place a book at exact 1-indexed coordinate.
    // Returns true on success; false if coordinate invalid or already occupied.
    bool placeBook(const Book& book, int page, int row, int slot) {
        if (!isValidCoordinate(page, row, slot)) {
            // Dynamically allocate pages if page > pages_.size()
            if (page > static_cast<int>(pages_.size()) && row >= 1 && row <= ROWS_PER_PAGE && slot >= 1 && slot <= SLOTS_PER_ROW) {
                ensurePages(page);
            } else {
                return false;
            }
        }

        Slot& target = pages_[page - 1].grid[row - 1][slot - 1];
        if (target.isOccupied) {
            return false; // Collision prevention: slot already taken!
        }

        target.bookId = book.bookId;
        target.title = book.title;
        target.author = book.author;
        target.genre = book.genre;
        target.borrowCount = book.borrowCount;
        target.popularityScore = book.popularityScore;
        target.isOccupied = true;
        ++occupiedCount_;
        return true;
    }

    // Allocate the next available slot sequentially starting from page 1, row 1, slot 1.
    // Returns true and populates assigned coordinates.
    bool allocateNextAvailableSlot(const Book& book, int& outPage, int& outRow, int& outSlot) {
        size_t currentSlotIndex = occupiedCount_;
        int page = static_cast<int>(currentSlotIndex / SLOTS_PER_PAGE) + 1;
        int rem = static_cast<int>(currentSlotIndex % SLOTS_PER_PAGE);
        int row = (rem / SLOTS_PER_ROW) + 1;
        int slot = (rem % SLOTS_PER_ROW) + 1;

        ensurePages(page);
        if (placeBook(book, page, row, slot)) {
            outPage = page;
            outRow = row;
            outSlot = slot;
            return true;
        }
        return false;
    }

    bool isSlotOccupied(int page, int row, int slot) const {
        if (!isValidCoordinate(page, row, slot)) return false;
        return pages_[page - 1].grid[row - 1][slot - 1].isOccupied;
    }

    const Slot* getSlot(int page, int row, int slot) const {
        if (!isValidCoordinate(page, row, slot)) return nullptr;
        return &pages_[page - 1].grid[row - 1][slot - 1];
    }

    size_t getTotalPages() const {
        return pages_.size();
    }

    size_t getTotalOccupied() const {
        return occupiedCount_;
    }

    size_t getTotalCapacity() const {
        return pages_.size() * SLOTS_PER_PAGE;
    }

    // Convert internal 2D pages into structured JSON for frontend visualizer
    nlohmann::json toJson() const {
        nlohmann::json pagesJson = nlohmann::json::array();

        for (size_t p = 0; p < pages_.size(); ++p) {
            nlohmann::json pageObj;
            pageObj["page"] = pages_[p].pageNumber;
            pageObj["rows"] = ROWS_PER_PAGE;
            pageObj["slotsPerRow"] = SLOTS_PER_ROW;

            nlohmann::json slotsArray = nlohmann::json::array();
            for (int r = 0; r < ROWS_PER_PAGE; ++r) {
                for (int s = 0; s < SLOTS_PER_ROW; ++s) {
                    const Slot& slot = pages_[p].grid[r][s];
                    nlohmann::json slotObj;
                    slotObj["row"] = r + 1;
                    slotObj["slot"] = s + 1;
                    slotObj["isOccupied"] = slot.isOccupied;
                    if (slot.isOccupied) {
                        slotObj["bookId"] = slot.bookId;
                        slotObj["title"] = slot.title;
                        slotObj["author"] = slot.author;
                        slotObj["genre"] = slot.genre;
                        slotObj["borrowCount"] = slot.borrowCount;
                        slotObj["popularityScore"] = slot.popularityScore;
                    } else {
                        slotObj["bookId"] = nullptr;
                    }
                    slotsArray.push_back(slotObj);
                }
            }
            pageObj["slots"] = slotsArray;
            pagesJson.push_back(pageObj);
        }

        return pagesJson;
    }
};

} // namespace SmartShelf
