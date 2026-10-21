#pragma once

#include <string>
#include <cmath>
#include <algorithm>
#include "nlohmann/json.hpp"

namespace SmartShelf {

struct ShelfPosition {
    int shelfPage{1}; // 1-indexed (Page 1, 2, ...)
    int shelfRow{1};  // 1-indexed (Row 1..4: Row 1 = Top/Eye-level tier)
    int shelfSlot{1}; // 1-indexed (Slot 1..5 per row)

    bool operator==(const ShelfPosition& other) const {
        return shelfPage == other.shelfPage &&
               shelfRow == other.shelfRow &&
               shelfSlot == other.shelfSlot;
    }
};

struct Book {
    std::string bookId;
    std::string title;
    std::string author;
    std::string genre;
    int borrowCount{0};
    int popularityScore{0};
    bool availability{true};

    // Shelf assignment (1-indexed coordinates)
    int shelfPage{0};
    int shelfRow{0};
    int shelfSlot{0};

    // Calculate popularity score deterministically from borrowCount
    // Formula: logarithmic scaling capped at 100
    // e.g. 0 borrows -> 0 score; 10 borrows -> 52; 30 borrows -> 74; 100 borrows -> 100
    static int calculatePopularityScore(int borrows) {
        if (borrows <= 0) return 0;
        double score = std::log2(static_cast<double>(borrows) + 1.0) * 15.0;
        int rounded = static_cast<int>(std::round(score));
        return std::min(100, std::max(0, rounded));
    }

    // Validation rule
    bool isValid(std::string& errorMessage) const {
        if (bookId.empty()) {
            errorMessage = "Book ID cannot be empty.";
            return false;
        }
        if (title.empty()) {
            errorMessage = "Book title cannot be empty for ID: " + bookId;
            return false;
        }
        if (genre.empty()) {
            errorMessage = "Book genre cannot be empty for ID: " + bookId;
            return false;
        }
        if (borrowCount < 0) {
            errorMessage = "Borrow count cannot be negative for ID: " + bookId;
            return false;
        }
        return true;
    }
};

// nlohmann JSON serialization
inline void to_json(nlohmann::json& j, const Book& b) {
    j = nlohmann::json{
        {"bookId", b.bookId},
        {"title", b.title},
        {"author", b.author},
        {"genre", b.genre},
        {"borrowCount", b.borrowCount},
        {"popularityScore", b.popularityScore},
        {"availability", b.availability},
        {"shelfPage", b.shelfPage},
        {"shelfRow", b.shelfRow},
        {"shelfSlot", b.shelfSlot}
    };
}

// nlohmann JSON deserialization with safe defaults
inline void from_json(const nlohmann::json& j, Book& b) {
    b.bookId = j.value("bookId", "");
    b.title = j.value("title", "");
    b.author = j.value("author", "Unknown Author");
    b.genre = j.value("genre", "General");
    b.borrowCount = j.value("borrowCount", 0);

    // If popularityScore is provided and > 0, use it; otherwise compute from borrowCount
    if (j.contains("popularityScore") && j["popularityScore"].is_number()) {
        b.popularityScore = j["popularityScore"].get<int>();
    } else {
        b.popularityScore = Book::calculatePopularityScore(b.borrowCount);
    }

    // Handle availability as boolean OR string ("available" / "borrowed")
    if (j.contains("availability")) {
        if (j["availability"].is_boolean()) {
            b.availability = j["availability"].get<bool>();
        } else if (j["availability"].is_string()) {
            std::string availStr = j["availability"].get<std::string>();
            b.availability = (availStr == "available" || availStr == "true" || availStr == "1");
        } else {
            b.availability = true;
        }
    } else {
        b.availability = true;
    }

    b.shelfPage = j.value("shelfPage", 0);
    b.shelfRow = j.value("shelfRow", 0);
    b.shelfSlot = j.value("shelfSlot", 0);
}

} // namespace SmartShelf
