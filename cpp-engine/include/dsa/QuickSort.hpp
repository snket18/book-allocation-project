#pragma once

#include <vector>
#include <utility>
#include <cstddef>
#include "../models/Book.hpp"

namespace SmartShelf {

/**
 * ============================================================================
 * DSA COMPONENT: Custom In-Place Quick Sort
 * ============================================================================
 * 
 * Purpose:
 *   Sorts books within each genre so that the most frequently borrowed books
 *   are ranked at the front, with ties broken alphabetically by title.
 * 
 * Multi-Key Ordering Rule:
 *   1. Primary Key:   borrowCount in DESCENDING order (higher circulation first).
 *   2. Secondary Key: title in ASCENDING alphabetical order (tie-breaker).
 * 
 * Pivot Selection:
 *   Median-of-Three (Low, Mid, High).
 *   Mitigates the O(N^2) worst-case performance on already-sorted or reverse-sorted
 *   datasets by choosing the median among arr[low], arr[mid], and arr[high].
 * 
 * Complexity Analysis:
 *   - Average Time: O(N log N)
 *       Divides the array into roughly equal halves with O(N) partitioning per level.
 *   - Best Time:    O(N log N)
 *       Occurs when the pivot consistently divides the range into equal subproblems.
 *   - Worst Time:   O(N^2)
 *       Occurs if partitions are completely unbalanced (e.g. 1 element vs N-1 elements)
 *       at every recursive step. Median-of-three dramatically reduces this likelihood.
 *   - Auxiliary Space: O(log N)
 *       In-place partitioning requires zero extra data arrays; memory is solely
 *       consumed by the recursive call stack frames.
 * ============================================================================
 */
class QuickSort {
public:
    // Returns true if book 'a' should precede book 'b' in the ranked order
    static bool compare(const Book& a, const Book& b) {
        if (a.borrowCount != b.borrowCount) {
            return a.borrowCount > b.borrowCount; // Primary: Higher borrow count first
        }
        return a.title < b.title; // Secondary: Alphabetical title tie-breaker
    }

private:
    // Manual swap helper
    static void swapBooks(Book& a, Book& b) {
        Book temp = a;
        a = b;
        b = temp;
    }

    // Partition logic using Lomuto / Hoare style with median-of-three
    static int partition(std::vector<Book>& arr, int low, int high) {
        // Median-of-three pivot selection
        int mid = low + (high - low) / 2;

        if (compare(arr[mid], arr[low])) {
            swapBooks(arr[low], arr[mid]);
        }
        if (compare(arr[high], arr[low])) {
            swapBooks(arr[low], arr[high]);
        }
        if (compare(arr[high], arr[mid])) {
            swapBooks(arr[mid], arr[high]);
        }

        // Now arr[mid] is the median. Place pivot at high - 1 for partitioning.
        swapBooks(arr[mid], arr[high]);
        Book pivot = arr[high];

        int i = low - 1;
        for (int j = low; j < high; ++j) {
            if (compare(arr[j], pivot)) {
                ++i;
                swapBooks(arr[i], arr[j]);
            }
        }
        swapBooks(arr[i + 1], arr[high]);
        return i + 1;
    }

    // Recursive Quick Sort core
    static void quickSortInternal(std::vector<Book>& arr, int low, int high) {
        if (low < high) {
            // Small base case: 2 elements
            if (high - low == 1) {
                if (compare(arr[high], arr[low])) {
                    swapBooks(arr[low], arr[high]);
                }
                return;
            }

            int pivotIndex = partition(arr, low, high);
            quickSortInternal(arr, low, pivotIndex - 1);
            quickSortInternal(arr, pivotIndex + 1, high);
        }
    }

public:
    // Public sorting API
    static void sort(std::vector<Book>& books) {
        if (books.size() <= 1) return;
        quickSortInternal(books, 0, static_cast<int>(books.size()) - 1);
    }
};

} // namespace SmartShelf
