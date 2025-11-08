import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

async function uploadFolder(folderPath) {
  const files = fs.readdirSync(folderPath);

  const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));

  const uploadPromises = imageFiles.map(file => {
    const filePath = path.join(folderPath, file);
    return cloudinary.uploader.upload(filePath, { folder: process.env.FOLDER_NAME });
  });

  const results = await Promise.all(uploadPromises);
  return results;
}

const projectID = process.env.VERCEL_PROJECT_ID;
const hookID = process.env.VERCEL_HOOK_ID;

async function triggerVercelDeploy() {
  const deployHookUrl = process.env.VERCEL_HOOK_URL;

  try {
    const response = await fetch(deployHookUrl, { method: 'POST' });

    if (response.ok) {
      console.log('Vercel deployment triggered successfully');
    } else {
      const errorText = await response.text();
      console.error('Failed to trigger Vercel deployment:', errorText);
    }
  } catch (error) {
    console.error('Error triggering Vercel deployment:', error);
  }
}


async function main() {
  try {
    const results = await uploadFolder('./../../Pictures/OHPICS/_post-opt');
    console.log('Uploaded images:', results);

    // Trigger deployment here
    await triggerVercelDeploy();
  } catch (error) {
    console.error('Error uploading folder:', error);
  }
}

main();