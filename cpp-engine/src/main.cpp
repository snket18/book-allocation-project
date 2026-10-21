#include <iostream>
#include <string>
#include <vector>
#include "nlohmann/json.hpp"
#include "models/Book.hpp"
#include "engine/ShelfOptimizer.hpp"

using json = nlohmann::json;
using namespace SmartShelf;

int main() {
    // Disable synchronization with C stdio streams for faster I/O
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(nullptr);

    json requestJson;

    // Read full JSON string from standard input
    try {
        std::cin >> requestJson;
    } catch (const json::parse_error& e) {
        std::cerr << "[ShelfEngine ERROR] JSON Parse Failure: " << e.what() << "\n";
        json errorResponse = {
            {"success", false},
            {"error", std::string("Malformed JSON input: ") + e.what()}
        };
        std::cout << errorResponse.dump() << "\n";
        return 1;
    }

    // Determine the requested action (default: "optimize")
    std::string action = requestJson.value("action", "optimize");
    std::cerr << "[ShelfEngine INFO] Received action: '" << action << "'\n";

    // Handle Health Ping
    if (action == "ping") {
        json pingResponse = {
            {"success", true},
            {"status", "ready"},
            {"engine", "SmartShelf C++ DSA Engine"},
            {"version", "1.0.0"}
        };
        std::cout << pingResponse.dump() << "\n";
        return 0;
    }

    // Extract books array safely
    if (!requestJson.contains("books") || !requestJson["books"].is_array()) {
        std::cerr << "[ShelfEngine ERROR] Missing or invalid 'books' array in payload\n";
        json errorResponse = {
            {"success", false},
            {"error", "Request payload must contain a 'books' array."}
        };
        std::cout << errorResponse.dump() << "\n";
        return 1;
    }

    std::vector<Book> books;
    try {
        books = requestJson["books"].get<std::vector<Book>>();
    } catch (const json::exception& e) {
        std::cerr << "[ShelfEngine ERROR] Deserialization failure: " << e.what() << "\n";
        json errorResponse = {
            {"success", false},
            {"error", std::string("Failed to parse book records: ") + e.what()}
        };
        std::cout << errorResponse.dump() << "\n";
        return 1;
    }

    std::cerr << "[ShelfEngine INFO] Successfully parsed " << books.size() << " book records\n";

    json result;

    if (action == "optimize") {
        result = ShelfOptimizer::optimizeShelves(books);
    } else if (action == "search_id") {
        std::string targetId = requestJson.value("bookId", "");
        if (targetId.empty()) {
            result = {
                {"success", false},
                {"error", "Action 'search_id' requires a non-empty 'bookId' field."}
            };
        } else {
            result = ShelfOptimizer::searchById(books, targetId);
        }
    } else if (action == "search_genre") {
        std::string targetGenre = requestJson.value("genre", "");
        if (targetGenre.empty()) {
            result = {
                {"success", false},
                {"error", "Action 'search_genre' requires a non-empty 'genre' field."}
            };
        } else {
            result = ShelfOptimizer::searchByGenre(books, targetGenre);
        }
    } else {
        std::cerr << "[ShelfEngine ERROR] Unknown action: " << action << "\n";
        result = {
            {"success", false},
            {"error", "Unknown action '" + action + "'. Supported actions: 'optimize', 'search_id', 'search_genre', 'ping'."}
        };
    }

    // Write exactly ONE output JSON string to stdout
    std::cout << result.dump() << "\n";
    return 0;
}
