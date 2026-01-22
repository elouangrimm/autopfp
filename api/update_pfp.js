// File: /api/update_pfp.js
// Authenticated endpoint for cron jobs and manual updates with Vercel authentication

import { updateProfile } from './lib/update_profile.js';

// This is the main function that Vercel will run for cron jobs
export default async function handler(request, response) {
    console.log("--- Starting Bluesky Profile Updater (Authenticated) ---");

    try {
        const result = await updateProfile();
        console.log(`✅ Authenticated update successful: ${result.pfpFile}`);
        response.status(200).send(result.message);

    } catch (error) {
        console.error("❌ An error occurred during the process:");
        console.error(error);
        response.status(500).send(`An error occurred: ${error.message}`);
    }
}
