import express from "express";
import { getUserWorkspace, addMember } from "../controllers/workspaceController.js";
const workspaceRouter = express.Router();

workspaceRouter.get('/', getUserWorkspace);
workspaceRouter.post('/add-member', addMember);

export default workspaceRouter;