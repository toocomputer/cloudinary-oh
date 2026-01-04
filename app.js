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

  if (imageFiles.length === 0) {
    console.log('Upload folder empty');
    return 'Upload folder empty';
  }

  const uploadPromises = imageFiles.map((file) => {
    const filePath = path.join(folderPath, file);
    return cloudinary.uploader.upload(filePath, { folder: process.env.FOLDER_NAME });
  });

  const results = await Promise.all(uploadPromises);
  return results.map(result => result.original_filename);
}

const projectID = process.env.VERCEL_PROJECT_ID;
const vercelToken = process.env.VERCEL_API_TOKEN;
const deployHookUrl = process.env.VERCEL_HOOK_URL;

async function triggerVercelDeploy() {
  try {
    const response = await fetch(deployHookUrl, { method: 'POST' });

    if (response.ok) {
      console.log('Vercel deployment triggered successfully');
      return true;
    } else {
      const errorText = await response.text();
      console.error('Failed to trigger Vercel deployment:', errorText);
      return false;
    }
  } catch (error) {
    console.error('Error triggering Vercel deployment:', error);
    return false;
  }
}

async function getLatestDeploymentStatus() {
  const url = `https://api.vercel.com/v6/deployments?projectId=${projectID}&limit=1`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${vercelToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch deployments: ${await response.text()}`);
  }

  const data = await response.json();
  if (data.deployments && data.deployments.length > 0) {
    const deployment = data.deployments[0];
    return {
      id: deployment.uid,
      state: deployment.state,
      url: deployment.url,
      createdAt: deployment.created,
    };
  }

  throw new Error("No deployments found");
}

async function pollDeploymentStatus(interval = 10000, timeout = 5 * 60 * 1000) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const status = await getLatestDeploymentStatus();
        console.log(`Deployment status: ${status.state}`);

        if (status.state === "READY") {
          console.log(`Deployment succeeded! URL: https://${status.url}`);
          resolve(status);
        } else if (status.state === "ERROR") {
          reject(new Error("Deployment failed."));
        } else {
          if (Date.now() - startTime > timeout) {
            reject(new Error("Deployment polling timed out."));
          } else {
            setTimeout(check, interval);
          }
        }
      } catch (error) {
        reject(error);
      }
    };

    check();
  });
}

async function main() {
  try {
    const results = await uploadFolder('./../../Pictures/OHPICS/_ready');
    if (results === 'Upload folder empty') {
      console.log('Skipping upload, proceeding to trigger deployment...');
    } else {
      console.log('Uploaded images:', results);
    }

    const triggered = await triggerVercelDeploy();
    if (triggered) {
      await pollDeploymentStatus();
    } else {
      console.error('Skipping deployment status polling due to trigger failure.');
    }
  } catch (error) {
    console.error('Error in process:', error);
  }
}

main();
