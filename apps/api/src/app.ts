import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { StorageService, defaultStorage } from './services/storage';
import { CppEngineService, defaultCppEngine } from './services/cppEngine';
import { AuthService, defaultAuth } from './services/auth';
import { ShelfService } from './services/shelf';
import { createStudentRouter } from './routes/student';
import { createAdminRouter } from './routes/admin';

export interface AppDependencies {
  storage?: StorageService;
  cppEngine?: CppEngineService;
  authService?: AuthService;
}

export const createApp = (deps: AppDependencies = {}): Express => {
  const app = express();

  const storage = deps.storage || defaultStorage;
  const cppEngine = deps.cppEngine || defaultCppEngine;
  const authService = deps.authService || defaultAuth;
  const shelfService = new ShelfService(storage, cppEngine);

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Smart Library API',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount Student and Public routes
  app.use('/api', createStudentRouter(storage, cppEngine));

  // Mount Admin Protected routes
  app.use('/api/admin', createAdminRouter(storage, shelfService, authService));

  // 404 Not Found Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route '${req.method} ${req.path}' not found.`,
      },
    });
  });

  // Central Error Handler (Prevents stack trace leaks)
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API Central Error Handler]', err);
    const message = err instanceof Error ? err.message : 'An unexpected internal error occurred.';
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message,
      },
    });
  });

  return app;
};
