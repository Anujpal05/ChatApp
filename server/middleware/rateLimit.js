// Small single-process limiter for development/single-instance deployments.
// Use Redis-backed rate limiting when horizontally scaling the API.
const buckets = new Map();

export const rateLimit = ({ windowMs = 60_000, max = 30, key = (req) => req.ip } = {}) =>
  (req, res, next) => {
    const now = Date.now();
    const id = `${key(req)}:${req.baseUrl}${req.path}`;
    const current = buckets.get(id);
    if (!current || current.resetAt <= now) {
      buckets.set(id, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > max) {
      res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ message: "Too many requests. Please try again shortly." });
    }
    return next();
  };
