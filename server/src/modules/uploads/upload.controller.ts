import type { Request, Response } from "express";
import fs from "fs";
import path from "path";

export const serveAvatar = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).send("Filename is required");
    }

    const uploadsDir = path.join(process.cwd(), "uploads", "avatars");

    // Check if directory exists
    if (!fs.existsSync(uploadsDir)) {
      return res.status(404).send("Avatars directory not found");
    }

    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("Avatar file not found");
    }

    // Check if it's an image file
    const ext = path.extname(filename).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"].includes(ext)) {
      return res.status(400).send("File is not a valid image");
    }

    // Set appropriate content type and headers for proper image display
    let mimeType: string;
    switch (ext) {
      case ".jpg":
      case ".jpeg":
        mimeType = "image/jpeg";
        break;
      case ".png":
        mimeType = "image/png";
        break;
      case ".gif":
        mimeType = "image/gif";
        break;
      case ".webp":
        mimeType = "image/webp";
        break;
      case ".svg":
        mimeType = "image/svg+xml";
        break;
      default:
        mimeType = "application/octet-stream";
    }

    // Set headers to prevent download and ensure proper display
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", "inline"); // Display inline instead of downloading
    res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    // Stream the file to the browser
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    res.status(500).send("Error serving avatar: " + error.message);
  }
};
