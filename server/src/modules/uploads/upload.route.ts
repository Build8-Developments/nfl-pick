import { Router } from "express";
import { serveAvatar } from "./upload.controller.js";

const uploadRouter = Router();

// Serve avatar images directly
uploadRouter.get("/avatars/:filename", serveAvatar);

export default uploadRouter;
