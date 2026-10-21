import type {
  ApiResponse,
  AuthUser,
  Book,
  OptimizationProposal,
  ShelfPage,
} from '@smart-library/shared';

const TOKEN_KEY = 'smart_lib_admin_token';
const USER_KEY = 'smart_lib_admin_user';

export class ApiClient {
  public static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public static setAuth(auth: AuthUser): void {
    localStorage.setItem(TOKEN_KEY, auth.token);
    localStorage.setItem(USER_KEY, JSON.stringify(auth));
  }

  public static clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  public static getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    let jsonResponse: ApiResponse<T>;
    try {
      jsonResponse = (await res.json()) as ApiResponse<T>;
    } catch {
      throw new Error(`Server returned HTTP ${res.status} with non-JSON response.`);
    }

    if (!res.ok || jsonResponse.success === false) {
      const errMsg =
        jsonResponse.error?.message ||
        jsonResponse.message ||
        `Request failed with status code ${res.status}`;
      throw new Error(errMsg);
    }

    return jsonResponse.data as T;
  }

  // --- Student APIs ---

  public static async getBooks(params: {
    page?: number;
    limit?: number;
    genre?: string;
    available?: boolean;
    search?: string;
    sortBy?: 'borrowCount' | 'title' | 'id';
    order?: 'asc' | 'desc';
  } = {}): Promise<{
    books: Book[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.genre && params.genre !== 'All') query.set('genre', params.genre);
    if (params.available !== undefined) query.set('available', params.available.toString());
    if (params.search) query.set('search', params.search);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.order) query.set('order', params.order);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/api/books${queryString}`);
  }

  public static async getBookById(id: string): Promise<Book> {
    return this.request(`/api/books/${encodeURIComponent(id)}`);
  }

  public static async searchBooks(query: string, type: 'title' | 'id' | 'genre' = 'title'): Promise<Book[]> {
    const q = encodeURIComponent(query.trim());
    return this.request(`/api/search?q=${q}&type=${type}`);
  }

  public static async getGenres(): Promise<{ genre: string; count: number }[]> {
    return this.request('/api/genres');
  }

  public static async getActiveShelves(): Promise<{
    pages: ShelfPage[];
    totalBooks: number;
    totalPages: number;
    totalOccupied: number;
    totalCapacity: number;
  }> {
    return this.request('/api/shelves/active');
  }

  public static async getAnalytics(): Promise<{
    totalBooks: number;
    availableCount: number;
    borrowedCount: number;
    totalBorrows: number;
    avgBorrows: number;
    genreCounts: Record<string, number>;
    mostBorrowed: Book[];
    shelfCapacity: {
      totalPages: number;
      totalCapacity: number;
      occupiedSlots: number;
      occupancyRate: number;
    };
  }> {
    return this.request('/api/analytics');
  }

  // --- Admin APIs ---

  public static async login(username: string, password: string): Promise<AuthUser> {
    const data = await this.request<AuthUser>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    this.setAuth(data);
    return data;
  }

  public static async logout(): Promise<void> {
    try {
      await this.request('/api/admin/logout', { method: 'POST' });
    } catch {
      // Ignore network failure on logout
    } finally {
      this.clearAuth();
    }
  }

  public static async addBook(book: {
    bookId: string;
    title: string;
    author: string;
    genre: string;
    borrowCount?: number;
  }): Promise<Book> {
    return this.request('/api/admin/books', {
      method: 'POST',
      body: JSON.stringify(book),
    });
  }

  public static async updateBook(
    id: string,
    book: Partial<Omit<Book, 'bookId'>>
  ): Promise<Book> {
    return this.request(`/api/admin/books/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(book),
    });
  }

  public static async deleteBook(id: string): Promise<{ bookId: string }> {
    return this.request(`/api/admin/books/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  public static async simulateBorrow(id: string): Promise<{
    book: Book;
    proposalGenerated: boolean;
    proposal?: OptimizationProposal;
  }> {
    return this.request(`/api/admin/books/${encodeURIComponent(id)}/borrow`, {
      method: 'POST',
    });
  }

  public static async simulateReturn(id: string): Promise<{
    book: Book;
    proposalGenerated: boolean;
    proposal?: OptimizationProposal;
  }> {
    return this.request(`/api/admin/books/${encodeURIComponent(id)}/return`, {
      method: 'POST',
    });
  }

  public static async optimizeShelves(): Promise<OptimizationProposal> {
    return this.request('/api/admin/shelves/optimize', {
      method: 'POST',
    });
  }

  public static async getProposal(): Promise<OptimizationProposal | null> {
    return this.request('/api/admin/shelves/proposal');
  }

  public static async adjustProposal(books: Book[]): Promise<OptimizationProposal> {
    return this.request('/api/admin/shelves/proposal', {
      method: 'PATCH',
      body: JSON.stringify({ books }),
    });
  }

  public static async approveProposal(): Promise<{ message: string; appliedCount: number }> {
    return this.request('/api/admin/shelves/proposal/approve', {
      method: 'POST',
    });
  }

  public static async rejectProposal(): Promise<{ message: string }> {
    return this.request('/api/admin/shelves/proposal/reject', {
      method: 'POST',
    });
  }
}
