import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Load .env if present
dotenv.config();

// Find workspace root reliably
const findWorkspaceRoot = (): string => {
  let curr = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(curr, 'pnpm-workspace.yaml'))) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return process.cwd();
};

const workspaceRoot = findWorkspaceRoot();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  workspaceRoot,
  dataFilePath: process.env.DATA_FILE_PATH
    ? path.resolve(workspaceRoot, process.env.DATA_FILE_PATH)
    : path.resolve(workspaceRoot, 'data/books.json'),
  cppEnginePath: process.env.CPP_ENGINE_PATH
    ? path.resolve(workspaceRoot, process.env.CPP_ENGINE_PATH)
    : path.resolve(workspaceRoot, 'cpp-engine/build/shelf_engine'),
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'adminpassword123',
  sessionSecret: process.env.SESSION_SECRET || 'smart_library_prototype_secret_key_change_in_prod',
  tokenDurationHours: 12,
  cppExecutionTimeoutMs: 5000,
};
