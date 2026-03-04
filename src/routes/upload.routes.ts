import express from "express";
import { uploadUrl, getUrl } from "../controllers/upload.controller";
import { protect } from "../middleware/auth.middleware"; // Assuming authentication is required

const router = express.Router();

// Route to get a presigned URL for image upload
router.post("/presigned-url", protect, uploadUrl);

// Route to get a signed URL for reading an image
router.post("/signed-url", protect, getUrl);

export default router;
