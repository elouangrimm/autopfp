// Simple in-memory rate limiter for Vercel serverless functions
// Note: This resets on each cold start, but provides basic protection

const rateLimitStore = new Map();

/**
 * Simple rate limiter that tracks requests by IP address
 * @param {string} identifier - Unique identifier (e.g., IP address)
 * @param {number} maxRequests - Maximum number of requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<{success: boolean, remaining: number, resetTime: number}>}
 */
export async function checkRateLimit(identifier, maxRequests = 10, windowMs = 3600000) {
    const now = Date.now();
    const record = rateLimitStore.get(identifier);

    if (!record) {
        // First request from this identifier
        rateLimitStore.set(identifier, {
            count: 1,
            resetTime: now + windowMs
        });
        return {
            success: true,
            remaining: maxRequests - 1,
            resetTime: now + windowMs
        };
    }

    // Check if the time window has expired
    if (now > record.resetTime) {
        // Reset the counter
        rateLimitStore.set(identifier, {
            count: 1,
            resetTime: now + windowMs
        });
        return {
            success: true,
            remaining: maxRequests - 1,
            resetTime: now + windowMs
        };
    }

    // Check if limit is exceeded
    if (record.count >= maxRequests) {
        return {
            success: false,
            remaining: 0,
            resetTime: record.resetTime
        };
    }

    // Increment counter
    record.count += 1;
    rateLimitStore.set(identifier, record);

    return {
        success: true,
        remaining: maxRequests - record.count,
        resetTime: record.resetTime
    };
}

/**
 * Clean up old entries from the rate limit store
 */
export function cleanupRateLimitStore() {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (now > value.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}

// Cleanup old entries every 10 minutes
setInterval(cleanupRateLimitStore, 10 * 60 * 1000);
