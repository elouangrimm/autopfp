// File: /api/update-profile.js

import { BskyAgent } from '@atproto/api';
import { promises as fs } from 'fs';
import path from 'path';

// This is the main function that Vercel will run.
export default async function handler(request, response) {
    console.log("--- Starting Bluesky Profile Updater Cron Job ---");

    // Use environment variables for security. We will set these in Vercel.
    const handle = process.env.BLUESKY_HANDLE;
    const password = process.env.BLUESKY_APP_PASSWORD;

    if (!handle || !password) {
        console.error("Missing environment variables!");
        return response.status(500).send("Server configuration error.");
    }

    try {
        // --- 1. Login to Bluesky ---
        const agent = new BskyAgent({ service: 'https://bsky.social' });
        console.log(`Attempting to log in as ${handle}...`);
        await agent.login({ identifier: handle, password });
        console.log("✅ Login successful.");

        // --- 2. Fetch Existing Profile to Preserve Data ---
        console.log("Fetching current profile to preserve display name and description...");
        const profile = await agent.getProfile({ actor: agent.session.did });
        const existingDisplayName = profile.data.displayName;
        const existingDescription = profile.data.description;
        console.log(`✅ Found Display Name: ${existingDisplayName}`);

        // --- 3. Select Random Images ---
        const pfpDir = path.join(process.cwd(), 'pfps');
        const pfpFiles = await fs.readdir(pfpDir);
        const chosenPfpFile = pfpFiles[Math.floor(Math.random() * pfpFiles.length)];
        console.log(`👉 Selected random PFP: ${chosenPfpFile}`);

        // --- 4. Read and Upload Images ---
        const pfpPath = path.join(pfpDir, chosenPfpFile);
        const pfpData = await fs.readFile(pfpPath);
        console.log("Uploading PFP blob...");
        const pfpUpload = await agent.uploadBlob(pfpData, { encoding: 'image/png' }); // Change to 'image/jpeg' if needed
        console.log("✅ PFP uploaded.");

        let bannerUpload = null;
        const bannerPath = path.join(process.cwd(), 'banners', chosenPfpFile);
        try {
            const bannerData = await fs.readFile(bannerPath);
            console.log("Found and uploading matching banner blob...");
            bannerUpload = await agent.uploadBlob(bannerData, { encoding: 'image/png' });
            console.log("✅ Banner uploaded.");
        } catch (error) {
            console.log("ℹ️ No matching banner found. Skipping.");
        }

        // --- 5. Send the Final Update ---
        console.log("🚀 Preparing and sending the final profile record...");
        await agent.api.com.atproto.repo.putRecord({
            repo: agent.session.did,
            collection: 'app.bsky.actor.profile',
            rkey: 'self',
            record: {
                // This is the crucial part:
                $type: 'app.bsky.actor.profile',
                displayName: existingDisplayName, // Use the fetched display name
                description: existingDescription, // Use the fetched description
                avatar: pfpUpload.data.blob,      // Use the new avatar
                ...(bannerUpload && { banner: bannerUpload.data.blob }), // Only add the banner key if it was uploaded
            },
        });

        console.log(`Success!!! Updated to: ${chosenPfpFile}`);
        // Send a success response back to Vercel
        response.status(200).send(`Profile updated with ${chosenPfpFile}!`);

    } catch (error) {
        console.error("❌ An error occurred during the process:");
        console.error(error);
        response.status(500).send(`An error occurred: ${error.message}`);
    }
}
