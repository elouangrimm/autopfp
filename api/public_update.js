// Public endpoint for updating Bluesky profile with rate limiting
// Anyone can trigger this endpoint, but it has rate limits to prevent abuse

import { updateProfile } from './lib/update_profile.js';
import { checkRateLimit } from './lib/rate_limiter.js';

/**
 * Gets the client IP address from the request
 * Handles various proxy headers that Vercel might use
 */
function getClientIP(request) {
    // Try various headers in order of preference
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
        // x-forwarded-for can be a comma-separated list
        return forwarded.split(',')[0].trim();
    }
    
    const realIP = request.headers['x-real-ip'];
    if (realIP) {
        return realIP;
    }
    
    const remoteAddr = request.connection?.remoteAddress || request.socket?.remoteAddress;
    if (remoteAddr) {
        return remoteAddr;
    }
    
    // If we can't determine IP, use a very restrictive shared pool
    // This prevents abuse from unidentifiable sources
    return 'unknown-shared-pool';
}

/**
 * Public handler for Bluesky profile updates
 * Rate limited to prevent abuse:
 * - 3 requests per hour per IP (aligns with conservative Bluesky API usage)
 * - Returns 429 Too Many Requests if limit exceeded
 */
export default async function handler(request, response) {
    console.log("--- Public Update Endpoint Called ---");
    
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);
    console.log(`Request from IP: ${clientIP}`);

    // Rate limit: 3 requests per hour per IP
    // This is conservative given Bluesky's API limits
    const rateLimit = await checkRateLimit(clientIP, 3, 60 * 60 * 1000);

    // Set rate limit headers for transparency
    response.setHeader('X-RateLimit-Limit', '3');
    response.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

    if (!rateLimit.success) {
        const resetDate = new Date(rateLimit.resetTime);
        console.log(`Rate limit exceeded for IP: ${clientIP}`);
        return response.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Too many update requests. Please try again later.',
            resetTime: resetDate.toISOString(),
            limit: 3,
            window: '1 hour'
        });
    }

    try {
        const result = await updateProfile();
        console.log(`✅ Public update successful: ${result.pfpFile}`);
        
        return response.status(200).json({
            success: true,
            message: result.message,
            pfpFile: result.pfpFile,
            rateLimit: {
                remaining: rateLimit.remaining,
                resetTime: new Date(rateLimit.resetTime).toISOString()
            }
        });

    } catch (error) {
        console.error("❌ Error during public update:");
        console.error(error);
        return response.status(500).json({
            error: 'Update failed',
            message: error.message || 'An error occurred during the update'
        });
    }
}
