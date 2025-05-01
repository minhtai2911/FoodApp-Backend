import { Router } from "express";
import chatbotController from "../controllers/chatbotController.js"

const router = Router();

router.post('/', chatbotController.chatbot);

export default router;