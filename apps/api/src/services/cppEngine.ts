import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { Book, OptimizationProposal, ShelfPage } from '@smart-library/shared';
import { config } from '../config';

export interface CppEngineOptimizeResult {
  success: boolean;
  shelfPages: ShelfPage[];
  assignments: Book[];
  moves: OptimizationProposal['moves'];
  metadata: OptimizationProposal['metadata'];
  error?: string;
}

export class CppEngineService {
  private executablePath: string;
  private timeoutMs: number;

  constructor(customExecutablePath?: string, timeoutMs: number = config.cppExecutionTimeoutMs) {
    this.executablePath = customExecutablePath || config.cppEnginePath;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Invokes the compiled C++ shelf_engine process with a JSON payload
   */
  public async execute<TRequest extends object, TResponse extends object>(payload: TRequest): Promise<TResponse> {
    if (!fs.existsSync(this.executablePath)) {
      throw new Error(
        `C++ engine executable not found at: '${this.executablePath}'. Please compile the engine first by running 'pnpm run build:cpp'.`
      );
    }

    return new Promise<TResponse>((resolve, reject) => {
      let isSettled = false;
      const child = spawn(this.executablePath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdoutData = '';
      let stderrData = '';

      const timeoutTimer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          child.kill('SIGKILL');
          reject(new Error(`C++ DSA engine execution timed out after ${this.timeoutMs}ms.`));
        }
      }, this.timeoutMs);

      child.stdout.on('data', (chunk) => {
        stdoutData += chunk.toString('utf-8');
      });

      child.stderr.on('data', (chunk) => {
        stderrData += chunk.toString('utf-8');
      });

      child.on('error', (err) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutTimer);
          reject(new Error(`Failed to start C++ process: ${err.message}`));
        }
      });

      child.on('close', (code) => {
        if (isSettled) return;
        isSettled = true;
        clearTimeout(timeoutTimer);

        if (stderrData.trim()) {
          console.debug('[CppEngine stderr]', stderrData.trim());
        }

        if (code !== 0 && !stdoutData.trim()) {
          return reject(
            new Error(`C++ process exited with code ${code}. Stderr: ${stderrData.trim() || 'None'}`)
          );
        }

        try {
          const parsed = JSON.parse(stdoutData.trim()) as TResponse;
          resolve(parsed);
        } catch (parseErr) {
          reject(
            new Error(
              `Malformed JSON response from C++ engine: ${
                parseErr instanceof Error ? parseErr.message : String(parseErr)
              }. Raw output: ${stdoutData.slice(0, 300)}`
            )
          );
        }
      });

      // Send payload via stdin and close stream
      try {
        const inputStr = JSON.stringify(payload);
        child.stdin.write(inputStr, 'utf-8', () => {
          child.stdin.end();
        });
      } catch (writeErr) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutTimer);
          child.kill();
          reject(new Error(`Failed to write to C++ stdin: ${writeErr instanceof Error ? writeErr.message : String(writeErr)}`));
        }
      }
    });
  }

  /**
   * Run optimization over the entire book dataset
   */
  public async optimizeShelves(books: Book[]): Promise<CppEngineOptimizeResult> {
    const payload = {
      action: 'optimize',
      books,
    };

    const response = await this.execute<typeof payload, CppEngineOptimizeResult>(payload);
    if (!response.success) {
      throw new Error(response.error || 'C++ shelf optimization failed');
    }
    if (response.assignments && Array.isArray(response.assignments)) {
      for (const b of response.assignments) {
        if (typeof b.availability === 'string') {
          (b as { availability: unknown }).availability = (b.availability === 'available' || b.availability === 'true');
        } else {
          b.availability = Boolean(b.availability);
        }
      }
    }
    return response;
  }

  /**
   * Look up a single book by ID through the custom C++ Hash Table
   */
  public async searchById(books: Book[], bookId: string): Promise<Book | null> {
    const payload = {
      action: 'search_id',
      bookId,
      books,
    };

    interface SearchIdResponse {
      success: boolean;
      found: boolean;
      book?: Book;
      error?: string;
    }

    const response = await this.execute<typeof payload, SearchIdResponse>(payload);
    if (!response.success) {
      throw new Error(response.error || 'C++ search_id failed');
    }
    return response.found && response.book ? response.book : null;
  }

  /**
   * Look up all books in a genre through the custom C++ Binary Search Tree
   */
  public async searchByGenre(books: Book[], genre: string): Promise<Book[]> {
    const payload = {
      action: 'search_genre',
      genre,
      books,
    };

    interface SearchGenreResponse {
      success: boolean;
      found: boolean;
      books?: Book[];
      error?: string;
    }

    const response = await this.execute<typeof payload, SearchGenreResponse>(payload);
    if (!response.success) {
      throw new Error(response.error || 'C++ search_genre failed');
    }
    return response.found && response.books ? response.books : [];
  }
}

export const defaultCppEngine = new CppEngineService();
