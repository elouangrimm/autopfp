# Auto PFP Updater for Bluesky

Automatically updates your Bluesky profile picture from a collection of images.

## Homepage

Visit the homepage (`/` or `/index.html`) to see a simple web interface where you can:
- Click a button to update the profile picture
- See which image was selected
- View rate limit information
- Get instant feedback on the update status

## Endpoints

### 1. `/api/update_pfp` (Authenticated)
- **Usage**: Cron jobs and manual updates with Vercel authentication
- **Rate Limits**: None (relies on Vercel authentication)
- **Schedule**: Runs daily at midnight (configured in `vercel.json`)

### 2. `/api/public_update` (Public)
- **Usage**: Anyone can trigger an update
- **Rate Limits**: 3 requests per hour per IP address
- **Purpose**: Allow community members or friends to trigger updates

The public endpoint includes rate limiting to prevent abuse while allowing occasional manual triggers from the community. The rate limit (3 requests/hour) is conservative and aligns with responsible usage of the Bluesky API.

## Rate Limiting

The public endpoint implements the following safeguards:
- **3 requests per hour per IP address**
- Rate limit headers in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: When the rate limit resets
- Returns HTTP 429 when limit exceeded with reset time

## Setup

### Environment Variables
Set these in your Vercel project settings:
- `BLUESKY_HANDLE`: Your Bluesky handle
- `BLUESKY_APP_PASSWORD`: Your Bluesky app password

### Deployment
This project is designed to run on Vercel:
1. Connect your GitHub repository to Vercel
2. Set the environment variables
3. Deploy!

## File Structure
```
/api
  /lib
    update_profile.js   # Shared update logic
    rate_limiter.js     # Rate limiting utility
  update_pfp.js         # Authenticated endpoint (for cron)
  public_update.js      # Public endpoint (rate limited)
/pfps                   # Profile picture images
/banners                # Matching banner images (optional)
```

## Example Usage

### Public Endpoint
```bash
# Trigger an update (rate limited)
curl https://your-domain.vercel.app/api/public_update

# Response includes rate limit info:
{
  "success": true,
  "message": "Profile updated with image.png!",
  "pfpFile": "image.png",
  "rateLimit": {
    "remaining": 2,
    "resetTime": "2026-01-22T08:00:00.000Z"
  }
}
```

### Rate Limit Exceeded
```bash
# Response when limit is hit:
{
  "error": "Rate limit exceeded",
  "message": "Too many update requests. Please try again later.",
  "resetTime": "2026-01-22T08:00:00.000Z",
  "limit": 3,
  "window": "1 hour"
}
```
