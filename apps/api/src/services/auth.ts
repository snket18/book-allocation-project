import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { AuthUser, UserRole } from '@smart-library/shared';
import { config } from '../config';

export interface TokenPayload {
  username: string;
  role: UserRole;
  exp: number; // epoch ms
  studentId?: string;
  department?: string;
  name?: string;
}

export class AuthService {
  private loginAttempts: Map<string, { count: number; firstAttempt: number }> = new Map();
  private maxAttempts: number = 5;
  private lockoutWindowMs: number = 60 * 1000; // 1 minute

  /**
   * Hashes a password using crypto.scryptSync with a salt
   */
  public static hashPassword(password: string, salt: string = 'smart_lib_fixed_salt'): string {
    return crypto.scryptSync(password, salt, 32).toString('hex');
  }

  /**
   * Generates a signed, tamper-proof bearer token: base64(payload).signature
   */
  public static generateToken(
    username: string,
    role: UserRole = 'admin',
    extra?: { studentId?: string; department?: string; name?: string }
  ): AuthUser {
    const expiresAtMs = Date.now() + config.tokenDurationHours * 60 * 60 * 1000;
    const payload: TokenPayload = {
      username,
      role,
      exp: expiresAtMs,
      ...extra,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', config.sessionSecret)
      .update(payloadBase64)
      .digest('base64url');

    const token = `${payloadBase64}.${signature}`;

    return {
      username,
      role,
      token,
      expiresAt: new Date(expiresAtMs).toISOString(),
      studentId: extra?.studentId,
      department: extra?.department,
      name: extra?.name,
    };
  }

  /**
   * Verifies and decodes a signed bearer token
   */
  public static verifyToken(token: string): TokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, providedSig] = parts;

    // Check signature
    const expectedSig = crypto
      .createHmac('sha256', config.sessionSecret)
      .update(payloadBase64)
      .digest('base64url');

    // Constant-time comparison to prevent timing attacks
    const provBuf = Buffer.from(providedSig);
    const expBuf = Buffer.from(expectedSig);
    if (provBuf.length !== expBuf.length || !crypto.timingSafeEqual(provBuf, expBuf)) {
      return null;
    }

    try {
      const payload: TokenPayload = JSON.parse(
        Buffer.from(payloadBase64, 'base64url').toString('utf-8')
      );

      // Check expiry
      if (Date.now() > payload.exp) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Basic sliding-window rate limiting on login attempts
   */
  public checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = this.loginAttempts.get(ip);

    if (!record) {
      this.loginAttempts.set(ip, { count: 1, firstAttempt: now });
      return true;
    }

    if (now - record.firstAttempt > this.lockoutWindowMs) {
      // Window expired, reset
      this.loginAttempts.set(ip, { count: 1, firstAttempt: now });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      return false; // Rate limited
    }

    record.count += 1;
    return true;
  }

  public resetRateLimit(ip: string): void {
    this.loginAttempts.delete(ip);
  }
}

export const defaultAuth = new AuthService();

/**
 * Express Middleware: Protects Admin Endpoints
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization token required. Please log in as admin.',
      },
    });
    return;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  const verified = AuthService.verifyToken(token);

  if (!verified || verified.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid or expired administrative credentials.',
      },
    });
    return;
  }

  // Attach authenticated admin to request
  (req as Request & { adminUser?: TokenPayload }).adminUser = verified;
  next();
};

/**
 * Express Middleware: Protects Endpoints for any Authenticated User (Student or Admin)
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization token required. Please log in.',
      },
    });
    return;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  const verified = AuthService.verifyToken(token);

  if (!verified) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid or expired session token.',
      },
    });
    return;
  }

  (req as Request & { user?: TokenPayload }).user = verified;
  next();
};

