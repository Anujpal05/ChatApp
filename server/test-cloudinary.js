import cloudinary from "./config/cloudnaryConfig.js";

console.log("Testing 125 KB upload using upload_stream...");

const testBuffer = crypto.getRandomValues
  ? Buffer.from(
      Array.from({ length: 125620 }, () => Math.floor(Math.random() * 256)),
    )
  : Buffer.alloc(125620, "A");

try {
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "quicktalk/test",
        resource_type: "raw",
        public_id: `test-${Date.now()}`,
      },
      (error, uploaded) => {
        if (error) {
          reject(error);
        } else {
          resolve(uploaded);
        }
      },
    );

    stream.on("error", reject);
    stream.end(testBuffer);
  });

  console.log("UPLOAD SUCCESSFUL");
  console.log("Uploaded bytes:", result.bytes);
  console.log("URL:", result.secure_url);
} catch (error) {
  console.error("UPLOAD FAILED:", error);
}