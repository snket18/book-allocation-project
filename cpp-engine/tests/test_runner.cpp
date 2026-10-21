#include <iostream>
#include <vector>
#include <cassert>
#include <string>
#include <set>
#include <sstream>
#include "models/Book.hpp"
#include "dsa/HashTable.hpp"
#include "dsa/BST.hpp"
#include "dsa/QuickSort.hpp"
#include "dsa/Shelf2DArray.hpp"
#include "engine/ShelfOptimizer.hpp"

using namespace SmartShelf;

// Simple test harness
int g_totalTests = 0;
int g_passedTests = 0;

void runTest(const std::string& testName, const std::function<void()>& testFunc) {
    ++g_totalTests;
    std::cout << "[TEST " << g_totalTests << "] " << testName << " ... ";
    try {
        testFunc();
        std::cout << "\033[32mPASSED\033[0m\n";
        ++g_passedTests;
    } catch (const std::exception& e) {
        std::cout << "\033[31mFAILED: " << e.what() << "\033[0m\n";
    } catch (...) {
        std::cout << "\033[31mFAILED with unknown exception\033[0m\n";
    }
}

#define ASSERT_TRUE(cond) \
    do { \
        if (!(cond)) { \
            std::ostringstream oss; \
            oss << "Assertion failed: (" #cond ") at " << __FILE__ << ":" << __LINE__; \
            throw std::runtime_error(oss.str()); \
        } \
    } while(0)

#define ASSERT_EQ(val1, val2) \
    do { \
        if ((val1) != (val2)) { \
            std::ostringstream oss; \
            oss << "Assertion failed: (" #val1 " == " #val2 ") [" << (val1) << " != " << (val2) << "] at " << __FILE__ << ":" << __LINE__; \
            throw std::runtime_error(oss.str()); \
        } \
    } while(0)

int main() {
    std::cout << "========================================================\n";
    std::cout << "  Smart Library C++ Engine - Comprehensive Test Suite   \n";
    std::cout << "========================================================\n";

    // 1. Quick Sort Correctness
    runTest("Quick Sort Correctness (Borrow Count DESC, Title ASC)", []() {
        std::vector<Book> books = {
            {"B1", "Zulu", "Author A", "CS", 10},
            {"B2", "Alpha", "Author B", "CS", 50},
            {"B3", "Bravo", "Author C", "CS", 30},
            {"B4", "Charlie", "Author D", "CS", 50}
        };

        QuickSort::sort(books);

        // Expect B2 ("Alpha", 50) before B4 ("Charlie", 50) because 'A' < 'C'
        ASSERT_EQ(books[0].bookId, "B2");
        ASSERT_EQ(books[0].borrowCount, 50);

        ASSERT_EQ(books[1].bookId, "B4");
        ASSERT_EQ(books[1].borrowCount, 50);

        ASSERT_EQ(books[2].bookId, "B3");
        ASSERT_EQ(books[2].borrowCount, 30);

        ASSERT_EQ(books[3].bookId, "B1");
        ASSERT_EQ(books[3].borrowCount, 10);
    });

    // 2. Hash Table Collision Handling
    runTest("Hash Table Collision Handling (Separate Chaining)", []() {
        // Create small table capacity = 3 to force heavy collisions
        HashTable table(3);

        Book b1{"ID1", "Book 1", "A1", "Genre1", 10};
        Book b2{"ID2", "Book 2", "A2", "Genre2", 20};
        Book b3{"ID3", "Book 3", "A3", "Genre3", 30};
        Book b4{"ID4", "Book 4", "A4", "Genre4", 40};
        Book b5{"ID5", "Book 5", "A5", "Genre5", 50};

        ASSERT_TRUE(table.insert(b1));
        ASSERT_TRUE(table.insert(b2));
        ASSERT_TRUE(table.insert(b3));
        ASSERT_TRUE(table.insert(b4));
        ASSERT_TRUE(table.insert(b5));
        ASSERT_EQ(table.size(), 5);

        // Verify all can still be found in O(1) avg time through separate chaining
        ASSERT_TRUE(table.contains("ID1"));
        ASSERT_TRUE(table.contains("ID2"));
        ASSERT_TRUE(table.contains("ID3"));
        ASSERT_TRUE(table.contains("ID4"));
        ASSERT_TRUE(table.contains("ID5"));
        ASSERT_TRUE(!table.contains("ID999"));

        // Test update
        Book b1Updated = b1;
        b1Updated.borrowCount = 99;
        ASSERT_TRUE(table.update(b1Updated));
        ASSERT_EQ(table.search("ID1")->borrowCount, 99);

        // Test remove
        ASSERT_TRUE(table.remove("ID3"));
        ASSERT_EQ(table.size(), 4);
        ASSERT_TRUE(!table.contains("ID3"));
    });

    // 3. BST Insertion and Search
    runTest("BST Insertion and Search", []() {
        GenreBST tree;
        Book b1{"B1", "OS", "Author", "Operating Systems", 10};
        Book b2{"B2", "DSA", "Author", "Algorithms", 20};
        Book b3{"B3", "DB", "Author", "Databases", 30};

        tree.insert(b1);
        tree.insert(b2);
        tree.insert(b3);

        ASSERT_EQ(tree.getGenreCount(), 3);
        ASSERT_TRUE(tree.containsGenre("Operating Systems"));
        ASSERT_TRUE(tree.containsGenre("Algorithms"));
        ASSERT_TRUE(tree.containsGenre("Databases"));
        ASSERT_TRUE(!tree.containsGenre("Physics"));

        const auto* found = tree.searchGenre("Algorithms");
        ASSERT_TRUE(found != nullptr);
        ASSERT_EQ(found->size(), 1);
        ASSERT_EQ((*found)[0].title, "DSA");
    });

    // 4. Duplicate Book IDs Validation
    runTest("Duplicate Book IDs Detection", []() {
        std::vector<Book> books = {
            {"DUP-01", "Book 1", "Author A", "CS", 10},
            {"DUP-01", "Book 2 with Same ID", "Author B", "CS", 20}
        };

        auto res = ShelfOptimizer::optimizeShelves(books);
        ASSERT_TRUE(!res["success"].get<bool>());
        ASSERT_TRUE(res.contains("error"));
        std::string err = res["error"].get<std::string>();
        ASSERT_TRUE(err.find("Duplicate Book ID") != std::string::npos);
    });

    // 5. Duplicate Genre Names
    runTest("Duplicate Genre Names (Aggregated in same BST Node)", []() {
        GenreBST tree;
        Book b1{"B1", "Intro to CS", "Author 1", "Computer Science", 10};
        Book b2{"B2", "Adv CS", "Author 2", "Computer Science", 25};
        Book b3{"B3", "Quantum", "Author 3", "Physics", 15};

        tree.insert(b1);
        tree.insert(b2); // Duplicate genre name!
        tree.insert(b3);

        // Must maintain exactly 2 unique genre nodes in the BST
        ASSERT_EQ(tree.getGenreCount(), 2);
        ASSERT_EQ(tree.getTotalBooksCount(), 3);

        const auto* csBooks = tree.searchGenre("Computer Science");
        ASSERT_TRUE(csBooks != nullptr);
        ASSERT_EQ(csBooks->size(), 2);
    });

    // 6. Empty Book Collection
    runTest("Empty Book Collection Handling", []() {
        std::vector<Book> emptyBooks;
        auto res = ShelfOptimizer::optimizeShelves(emptyBooks);

        ASSERT_TRUE(res["success"].get<bool>());
        ASSERT_EQ(res["metadata"]["totalBooks"].get<int>(), 0);
        ASSERT_EQ(res["metadata"]["totalPages"].get<int>(), 1);
        ASSERT_EQ(res["metadata"]["totalOccupied"].get<int>(), 0);
        ASSERT_EQ(res["metadata"]["emptySlots"].get<int>(), 20);
        ASSERT_EQ(res["assignments"].size(), 0);
    });

    // 7. Exactly 20 Books (1 Full Page)
    runTest("Boundary Test: Exactly 20 Books (1 Full Page)", []() {
        std::vector<Book> books;
        for (int i = 1; i <= 20; ++i) {
            books.push_back({"B" + std::to_string(i), "Book " + std::to_string(i), "Author", "Science", i});
        }

        auto res = ShelfOptimizer::optimizeShelves(books);
        ASSERT_TRUE(res["success"].get<bool>());
        ASSERT_EQ(res["metadata"]["totalPages"].get<int>(), 1);
        ASSERT_EQ(res["metadata"]["totalOccupied"].get<int>(), 20);
        ASSERT_EQ(res["metadata"]["emptySlots"].get<int>(), 0);
    });

    // 8. Exactly 21 Books (Crosses to Page 2)
    runTest("Boundary Test: Exactly 21 Books (Spills to Page 2)", []() {
        std::vector<Book> books;
        for (int i = 1; i <= 21; ++i) {
            books.push_back({"B" + std::to_string(i), "Book " + std::to_string(i), "Author", "Science", i});
        }

        auto res = ShelfOptimizer::optimizeShelves(books);
        ASSERT_TRUE(res["success"].get<bool>());
        ASSERT_EQ(res["metadata"]["totalPages"].get<int>(), 2);
        ASSERT_EQ(res["metadata"]["totalOccupied"].get<int>(), 21);
        ASSERT_EQ(res["metadata"]["totalCapacity"].get<int>(), 40);
        ASSERT_EQ(res["metadata"]["emptySlots"].get<int>(), 19);

        // Verify 21st book is located on Page 2, Row 1, Slot 1
        const auto& assignments = res["assignments"];
        ASSERT_EQ(assignments.size(), 21);
        const auto& lastBook = assignments[20];
        ASSERT_EQ(lastBook["shelfPage"].get<int>(), 2);
        ASSERT_EQ(lastBook["shelfRow"].get<int>(), 1);
        ASSERT_EQ(lastBook["shelfSlot"].get<int>(), 1);
    });

    // 9. Equal Popularity / Borrow Counts
    runTest("Equal Borrow Counts Tie-Breaking", []() {
        std::vector<Book> books = {
            {"B3", "Zeus", "A", "Mythology", 40},
            {"B1", "Apollo", "A", "Mythology", 40},
            {"B2", "Hermes", "A", "Mythology", 40}
        };

        auto res = ShelfOptimizer::optimizeShelves(books);
        ASSERT_TRUE(res["success"].get<bool>());

        const auto& assignments = res["assignments"];
        ASSERT_EQ(assignments[0]["title"].get<std::string>(), "Apollo");
        ASSERT_EQ(assignments[1]["title"].get<std::string>(), "Hermes");
        ASSERT_EQ(assignments[2]["title"].get<std::string>(), "Zeus");
    });

    // 10. Invalid or Missing Book Fields
    runTest("Invalid or Missing Book Fields Rejection", []() {
        // Missing title
        Book bad1{"ID-X", "", "Author", "Genre", 10};
        std::string err;
        ASSERT_TRUE(!bad1.isValid(err));

        // Negative borrow count
        Book bad2{"ID-Y", "Valid Title", "Author", "Genre", -5};
        ASSERT_TRUE(!bad2.isValid(err));

        std::vector<Book> invalidList = {bad1};
        auto res = ShelfOptimizer::optimizeShelves(invalidList);
        ASSERT_TRUE(!res["success"].get<bool>());
        ASSERT_TRUE(res.contains("error"));
    });

    // 11. Unique Shelf Positions Guarantee
    runTest("Guarantee Unique Shelf Positions (Zero Overlap)", []() {
        std::vector<Book> books;
        for (int i = 1; i <= 65; ++i) { // 65 books across 4 pages
            std::string g = (i % 3 == 0) ? "Fiction" : ((i % 3 == 1) ? "Science" : "History");
            books.push_back({"ID-" + std::to_string(i), "Title " + std::to_string(i), "Author", g, i * 2});
        }

        auto res = ShelfOptimizer::optimizeShelves(books);
        ASSERT_TRUE(res["success"].get<bool>());

        std::set<std::string> occupiedPositions;
        for (const auto& b : res["assignments"]) {
            int p = b["shelfPage"].get<int>();
            int r = b["shelfRow"].get<int>();
            int s = b["shelfSlot"].get<int>();

            std::string key = std::to_string(p) + ":" + std::to_string(r) + ":" + std::to_string(s);
            // Verify coordinate uniqueness
            ASSERT_TRUE(occupiedPositions.find(key) == occupiedPositions.end());
            occupiedPositions.insert(key);

            // Verify coordinate bounds
            ASSERT_TRUE(p >= 1 && p <= 4);
            ASSERT_TRUE(r >= 1 && r <= 4);
            ASSERT_TRUE(s >= 1 && s <= 5);
        }

        ASSERT_EQ(occupiedPositions.size(), 65);
    });

    // 12. Deterministic Optimization Output
    runTest("Deterministic Optimization Output Across Multiple Runs", []() {
        std::vector<Book> books = {
            {"B1", "Database Systems", "Silberschatz", "Computer Science", 35},
            {"B2", "Calculus Early Transcendentals", "Stewart", "Mathematics", 45},
            {"B3", "Introduction to Algorithms", "Cormen", "Computer Science", 85},
            {"B4", "Linear Algebra", "Strang", "Mathematics", 45},
            {"B5", "Clean Code", "Martin", "Computer Science", 60}
        };

        auto res1 = ShelfOptimizer::optimizeShelves(books);
        auto res2 = ShelfOptimizer::optimizeShelves(books);

        ASSERT_EQ(res1.dump(), res2.dump());
    });

    std::cout << "========================================================\n";
    std::cout << "  Test Summary: " << g_passedTests << " / " << g_totalTests << " Passed ("
              << (g_passedTests == g_totalTests ? "\033[32m100% SUCCESS\033[0m" : "\033[31mFAILURES DETECTED\033[0m")
              << ")\n";
    std::cout << "========================================================\n";

    return (g_passedTests == g_totalTests) ? 0 : 1;
}
