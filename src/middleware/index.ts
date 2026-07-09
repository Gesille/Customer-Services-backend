import { Request, Response, NextFunction } from 'express';

//  Simple in-memory rate limiter 
interface Window { count: number; resetAt: number }

const store = new Map<string, Window>();

function rateLimiter(opts: { windowMs: number; max: number; message: string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    let w      = store.get(key);

    if (!w || now > w.resetAt) {
      w = { count: 0, resetAt: now + opts.windowMs };
      store.set(key, w);
    }

    w.count++;
    res.setHeader('X-RateLimit-Limit',     opts.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, opts.max - w.count));
    res.setHeader('X-RateLimit-Reset',     Math.ceil(w.resetAt / 1000));

    if (w.count > opts.max) {
      res.status(429).json({ success: false, message: opts.message });
      return;
    }
    next();
  };
}

//  30 feedback submissions per IP per 15 min
export const feedbackLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max:      30,
  message:  'Too many submissions — please wait a few minutes before trying again.',
});

//  200 read requests per IP per minute
export const readLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max:      200,
  message:  'Too many requests — slow down a little.',
});


//  API key guard (optional, activate via API_KEY env var) 

export function apiKeyGuard(req: Request, res: Response, next: NextFunction): void {
  const requiredKey = process.env.API_KEY;
  if (!requiredKey) { next(); return; }          // guard disabled when key not set

  const provided = req.headers['x-api-key'];
  if (provided !== requiredKey) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }
  next();
}


//  Input sanitisation helper 

export function sanitizeString(value: unknown, maxLength = 200): string | undefined {
  if (value === undefined || value === null) return undefined;
  return String(value).trim().slice(0, maxLength);
}