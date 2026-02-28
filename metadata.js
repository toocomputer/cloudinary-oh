import { v2 as cloudinary } from "cloudinary";
import randomAlphanumericString from "./utils/randomString.js";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});


// 1. List images (metadata: true so we can skip images that already have imageid)
async function listImages(nextCursor = null) {
  const options = {
    type: 'upload',
    max_results: 500,
    metadata: true,
  };
  if (nextCursor) options.next_cursor = nextCursor;

  return cloudinary.api.resources(options);
}

// 2. Update image metadata
async function updateMetadata(publicId, metadata) {
  return cloudinary.api.update(publicId, {
    metadata: metadata
  });
}

// 3. Process all images
async function processAllImages() {
  let nextCursor = null;
  do {
    const result = await listImages(nextCursor);
    for (const image of result.resources) {
      if (image.metadata?.imageid || image.metadata?.ImageId) continue;
      const metadata = {
        imageid: randomAlphanumericString(8)
      };
      await updateMetadata(image.public_id, metadata);
    }
    nextCursor = result.next_cursor;
  } while (nextCursor);
}

processAllImages().catch(console.error);