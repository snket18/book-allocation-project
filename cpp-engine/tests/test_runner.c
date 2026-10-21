#include "book.h"
#include "cJSON.h"
#include "hashtable.h"
#include "bst.h"
#include "quicksort.h"
#include "shelf_2d.h"
#include "shelf_optimizer.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>

static int g_totalTests = 0;
static int g_passedTests = 0;

typedef void (*TestFunc)(void);

static void run_test(const char* name, TestFunc func) {
    g_totalTests++;
    printf("[TEST %d] %s ... ", g_totalTests, name);
    func();
    printf("\033[32mPASSED\033[0m\n");
    g_passedTests++;
}

#define ASSERT_TRUE(cond) do { \
    if (!(cond)) { \
        fprintf(stderr, "\nAssertion failed: (%s) at %s:%d\n", #cond, __FILE__, __LINE__); \
        exit(1); \
    } \
} while(0)

#define ASSERT_EQ(a, b) do { \
    if ((a) != (b)) { \
        fprintf(stderr, "\nAssertion failed: (%s == %s) [%ld != %ld] at %s:%d\n", #a, #b, (long)(a), (long)(b), __FILE__, __LINE__); \
        exit(1); \
    } \
} while(0)

#define ASSERT_STR_EQ(a, b) do { \
    if (strcmp((a), (b)) != 0) { \
        fprintf(stderr, "\nAssertion failed: (\"%s\" == \"%s\") at %s:%d\n", (a), (b), __FILE__, __LINE__); \
        exit(1); \
    } \
} while(0)

// Helper to make a book
static Book make_book(const char* id, const char* title, const char* author, const char* genre, int borrows) {
    Book b;
    memset(&b, 0, sizeof(Book));
    strncpy(b.bookId, id, MAX_ID_LEN - 1);
    strncpy(b.title, title, MAX_STR_LEN - 1);
    strncpy(b.author, author, MAX_STR_LEN - 1);
    strncpy(b.genre, genre, MAX_STR_LEN - 1);
    b.borrowCount = borrows;
    b.popularityScore = calculate_popularity_score(borrows);
    b.availability = true;
    return b;
}

// 1. Quick Sort Correctness
static void test_quicksort_correctness(void) {
    Book books[4];
    books[0] = make_book("B1", "Zulu", "Author A", "CS", 10);
    books[1] = make_book("B2", "Alpha", "Author B", "CS", 50);
    books[2] = make_book("B3", "Beta", "Author C", "CS", 30);
    books[3] = make_book("B4", "Gamma", "Author D", "CS", 50);

    quicksort_sort(books, 4);

    ASSERT_EQ(books[0].borrowCount, 50);
    ASSERT_STR_EQ(books[0].title, "Alpha");

    ASSERT_EQ(books[1].borrowCount, 50);
    ASSERT_STR_EQ(books[1].title, "Gamma");

    ASSERT_EQ(books[2].borrowCount, 30);
    ASSERT_STR_EQ(books[2].title, "Beta");

    ASSERT_EQ(books[3].borrowCount, 10);
    ASSERT_STR_EQ(books[3].title, "Zulu");
}

// 2. Hash Table Collision Handling
static void test_hashtable_collisions(void) {
    HashTable table;
    hashtable_init(&table, 5); // Small capacity forces collisions

    Book b1 = make_book("ID-100", "Book 1", "Auth", "CS", 10);
    Book b2 = make_book("ID-200", "Book 2", "Auth", "CS", 20);
    Book b3 = make_book("ID-300", "Book 3", "Auth", "CS", 30);

    ASSERT_TRUE(hashtable_insert(&table, &b1));
    ASSERT_TRUE(hashtable_insert(&table, &b2));
    ASSERT_TRUE(hashtable_insert(&table, &b3));

    ASSERT_EQ(table.size, 3);
    ASSERT_TRUE(hashtable_contains(&table, "ID-100"));
    ASSERT_TRUE(hashtable_contains(&table, "ID-200"));
    ASSERT_TRUE(hashtable_contains(&table, "ID-300"));
    ASSERT_TRUE(!hashtable_contains(&table, "ID-999"));

    Book* found = hashtable_search(&table, "ID-200");
    ASSERT_TRUE(found != NULL);
    ASSERT_STR_EQ(found->title, "Book 2");

    hashtable_free(&table);
}

// 3. BST Insertion and Search
static void test_bst_search(void) {
    GenreBST tree;
    bst_init(&tree);

    Book b1 = make_book("1", "Clean Code", "Robert Martin", "Software", 80);
    Book b2 = make_book("2", "Algorithms", "Cormen", "Algorithms", 90);
    Book b3 = make_book("3", "Calculus", "Stewart", "Mathematics", 40);

    bst_insert(&tree, &b1);
    bst_insert(&tree, &b2);
    bst_insert(&tree, &b3);

    ASSERT_EQ(tree.genreCount, 3);
    ASSERT_EQ(tree.totalBooks, 3);

    BSTNode* node = bst_search_genre(&tree, "Algorithms");
    ASSERT_TRUE(node != NULL);
    ASSERT_STR_EQ(node->genre, "Algorithms");
    ASSERT_EQ(node->bookCount, 1);

    BSTNode* notFound = bst_search_genre(&tree, "NonExistent");
    ASSERT_TRUE(notFound == NULL);

    bst_free(&tree);
}

// 4. Duplicate Book IDs Detection
static void test_duplicate_book_ids(void) {
    Book books[2];
    books[0] = make_book("CS-001", "Book One", "Author A", "CS", 10);
    books[1] = make_book("CS-001", "Book Two", "Author B", "CS", 20);

    cJSON* res = optimize_shelves(books, 2);
    cJSON* success = cJSON_GetObjectItemCaseSensitive(res, "success");
    ASSERT_TRUE(cJSON_IsFalse(success));

    cJSON* err = cJSON_GetObjectItemCaseSensitive(res, "error");
    ASSERT_TRUE(err != NULL && strstr(err->valuestring, "Duplicate Book ID") != NULL);

    cJSON_Delete(res);
}

// 5. Duplicate Genre Names
static void test_duplicate_genres(void) {
    GenreBST tree;
    bst_init(&tree);

    Book b1 = make_book("CS-001", "Book 1", "Author A", "Tech", 10);
    Book b2 = make_book("CS-002", "Book 2", "Author B", "Tech", 20);
    Book b3 = make_book("CS-003", "Book 3", "Author C", "Tech", 30);

    bst_insert(&tree, &b1);
    bst_insert(&tree, &b2);
    bst_insert(&tree, &b3);

    ASSERT_EQ(tree.genreCount, 1);
    ASSERT_EQ(tree.totalBooks, 3);

    BSTNode* node = bst_search_genre(&tree, "Tech");
    ASSERT_TRUE(node != NULL);
    ASSERT_EQ(node->bookCount, 3);

    bst_free(&tree);
}

// 6. Empty Book Collection
static void test_empty_collection(void) {
    cJSON* res = optimize_shelves(NULL, 0);
    cJSON* success = cJSON_GetObjectItemCaseSensitive(res, "success");
    ASSERT_TRUE(cJSON_IsTrue(success));

    cJSON* meta = cJSON_GetObjectItemCaseSensitive(res, "metadata");
    cJSON* total = cJSON_GetObjectItemCaseSensitive(meta, "totalBooks");
    ASSERT_EQ((int)total->valuedouble, 0);

    cJSON_Delete(res);
}

// 7. Exactly 20 Books (1 Full Page)
static void test_boundary_20_books(void) {
    Book books[20];
    for (int i = 0; i < 20; ++i) {
        char id[16], title[32];
        snprintf(id, sizeof(id), "B-%02d", i + 1);
        snprintf(title, sizeof(title), "Title %d", i + 1);
        books[i] = make_book(id, title, "Author", "Fiction", i * 2);
    }

    cJSON* res = optimize_shelves(books, 20);
    cJSON* meta = cJSON_GetObjectItemCaseSensitive(res, "metadata");
    cJSON* pages = cJSON_GetObjectItemCaseSensitive(meta, "totalPages");
    cJSON* empty = cJSON_GetObjectItemCaseSensitive(meta, "emptySlots");

    ASSERT_EQ((int)pages->valuedouble, 1);
    ASSERT_EQ((int)empty->valuedouble, 0);

    cJSON_Delete(res);
}

// 8. Exactly 21 Books (Spills to Page 2)
static void test_boundary_21_books(void) {
    Book books[21];
    for (int i = 0; i < 21; ++i) {
        char id[16], title[32];
        snprintf(id, sizeof(id), "B-%02d", i + 1);
        snprintf(title, sizeof(title), "Title %d", i + 1);
        books[i] = make_book(id, title, "Author", "Science", i);
    }

    cJSON* res = optimize_shelves(books, 21);
    cJSON* meta = cJSON_GetObjectItemCaseSensitive(res, "metadata");
    cJSON* pages = cJSON_GetObjectItemCaseSensitive(meta, "totalPages");
    cJSON* occupied = cJSON_GetObjectItemCaseSensitive(meta, "totalOccupied");
    cJSON* empty = cJSON_GetObjectItemCaseSensitive(meta, "emptySlots");

    ASSERT_EQ((int)pages->valuedouble, 2);
    ASSERT_EQ((int)occupied->valuedouble, 21);
    ASSERT_EQ((int)empty->valuedouble, 19);

    cJSON_Delete(res);
}

// 9. Equal Borrow Counts Tie-Breaking
static void test_equal_borrow_counts(void) {
    Book books[3];
    books[0] = make_book("1", "Zebra", "Author", "CS", 10);
    books[1] = make_book("2", "Apple", "Author", "CS", 10);
    books[2] = make_book("3", "Mango", "Author", "CS", 10);

    quicksort_sort(books, 3);

    ASSERT_STR_EQ(books[0].title, "Apple");
    ASSERT_STR_EQ(books[1].title, "Mango");
    ASSERT_STR_EQ(books[2].title, "Zebra");
}

// 10. Invalid Fields Rejection
static void test_invalid_fields(void) {
    Book b = make_book("", "Title", "Author", "CS", 10); // Missing ID
    char err[256];
    ASSERT_TRUE(!is_book_valid(&b, err, sizeof(err)));

    b = make_book("ID-1", "", "Author", "CS", 10); // Missing Title
    ASSERT_TRUE(!is_book_valid(&b, err, sizeof(err)));

    b = make_book("ID-1", "Title", "Author", "", 10); // Missing Genre
    ASSERT_TRUE(!is_book_valid(&b, err, sizeof(err)));

    b = make_book("ID-1", "Title", "Author", "CS", -5); // Negative borrows
    ASSERT_TRUE(!is_book_valid(&b, err, sizeof(err)));
}

// 11. Guarantee Unique Shelf Positions
static void test_unique_shelf_positions(void) {
    Book books[25];
    for (int i = 0; i < 25; ++i) {
        char id[16], title[32];
        snprintf(id, sizeof(id), "B-%02d", i + 1);
        snprintf(title, sizeof(title), "Title %d", i + 1);
        books[i] = make_book(id, title, "Author", (i % 2 == 0) ? "Math" : "Physics", i);
    }

    cJSON* res = optimize_shelves(books, 25);
    cJSON* assignments = cJSON_GetObjectItemCaseSensitive(res, "assignments");
    int count = cJSON_GetArraySize(assignments);
    ASSERT_EQ(count, 25);

    // Check all assigned (page, row, slot) are unique
    int taken[3][5][6]; // [page][row][slot]
    memset(taken, 0, sizeof(taken));

    for (int i = 0; i < count; ++i) {
        cJSON* b = cJSON_GetArrayItem(assignments, i);
        int p = (int)cJSON_GetObjectItemCaseSensitive(b, "shelfPage")->valuedouble;
        int r = (int)cJSON_GetObjectItemCaseSensitive(b, "shelfRow")->valuedouble;
        int s = (int)cJSON_GetObjectItemCaseSensitive(b, "shelfSlot")->valuedouble;

        ASSERT_TRUE(p >= 1 && p <= 2);
        ASSERT_TRUE(r >= 1 && r <= 4);
        ASSERT_TRUE(s >= 1 && s <= 5);
        ASSERT_EQ(taken[p][r][s], 0); // Must not be already taken!
        taken[p][r][s] = 1;
    }

    cJSON_Delete(res);
}

// 12. Deterministic Output Across Multiple Runs
static void test_deterministic_output(void) {
    Book books[10];
    for (int i = 0; i < 10; ++i) {
        char id[16], title[32];
        snprintf(id, sizeof(id), "DET-%d", i);
        snprintf(title, sizeof(title), "Det Title %d", 10 - i);
        books[i] = make_book(id, title, "Author", (i % 3 == 0) ? "History" : "Tech", i * 5);
    }

    cJSON* res1 = optimize_shelves(books, 10);
    cJSON* res2 = optimize_shelves(books, 10);

    char* str1 = cJSON_PrintUnformatted(res1);
    char* str2 = cJSON_PrintUnformatted(res2);

    ASSERT_STR_EQ(str1, str2);

    free(str1);
    free(str2);
    cJSON_Delete(res1);
    cJSON_Delete(res2);
}

int main(void) {
    printf("========================================================\n");
    printf("     Smart Library C Engine - Comprehensive Test Suite  \n");
    printf("========================================================\n");

    run_test("Quick Sort Correctness (Borrow Count DESC, Title ASC)", test_quicksort_correctness);
    run_test("Hash Table Collision Handling (Separate Chaining)", test_hashtable_collisions);
    run_test("BST Insertion and Search", test_bst_search);
    run_test("Duplicate Book IDs Detection", test_duplicate_book_ids);
    run_test("Duplicate Genre Names (Aggregated in same BST Node)", test_duplicate_genres);
    run_test("Empty Book Collection Handling", test_empty_collection);
    run_test("Boundary Test: Exactly 20 Books (1 Full Page)", test_boundary_20_books);
    run_test("Boundary Test: Exactly 21 Books (Spills to Page 2)", test_boundary_21_books);
    run_test("Equal Borrow Counts Tie-Breaking", test_equal_borrow_counts);
    run_test("Invalid or Missing Book Fields Rejection", test_invalid_fields);
    run_test("Guarantee Unique Shelf Positions (Zero Overlap)", test_unique_shelf_positions);
    run_test("Deterministic Optimization Output Across Multiple Runs", test_deterministic_output);

    printf("========================================================\n");
    printf("  Test Summary: %d / %d Passed (100%% SUCCESS)\n", g_passedTests, g_totalTests);
    printf("========================================================\n");

    return (g_passedTests == g_totalTests) ? 0 : 1;
}
