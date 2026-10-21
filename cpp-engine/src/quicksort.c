#include "quicksort.h"
#include <string.h>

bool quicksort_compare(const Book* a, const Book* b) {
    if (a->borrowCount != b->borrowCount) {
        return a->borrowCount > b->borrowCount; // Primary: Higher circulation first
    }
    return strcmp(a->title, b->title) < 0; // Secondary: Alphabetical title tie-breaker
}

static void swap_books(Book* a, Book* b) {
    Book temp = *a;
    *a = *b;
    *b = temp;
}

static int partition(Book* arr, int low, int high) {
    // Median-of-three pivot selection to prevent O(N^2) on sorted data
    int mid = low + (high - low) / 2;

    if (quicksort_compare(&arr[mid], &arr[low])) {
        swap_books(&arr[low], &arr[mid]);
    }
    if (quicksort_compare(&arr[high], &arr[low])) {
        swap_books(&arr[low], &arr[high]);
    }
    if (quicksort_compare(&arr[high], &arr[mid])) {
        swap_books(&arr[mid], &arr[high]);
    }

    // Place median pivot at high
    swap_books(&arr[mid], &arr[high]);
    Book pivot = arr[high];

    int i = low - 1;
    for (int j = low; j < high; ++j) {
        if (quicksort_compare(&arr[j], &pivot)) {
            ++i;
            swap_books(&arr[i], &arr[j]);
        }
    }
    swap_books(&arr[i + 1], &arr[high]);
    return i + 1;
}

void quicksort_books(Book* books, int low, int high) {
    if (low < high) {
        // Base case: 2 elements
        if (high - low == 1) {
            if (quicksort_compare(&books[high], &books[low])) {
                swap_books(&books[low], &books[high]);
            }
            return;
        }

        int pivotIndex = partition(books, low, high);
        quicksort_books(books, low, pivotIndex - 1);
        quicksort_books(books, pivotIndex + 1, high);
    }
}

void quicksort_sort(Book* books, size_t count) {
    if (!books || count <= 1) return;
    quicksort_books(books, 0, (int)count - 1);
}
