import express from 'express';
import { createProject, updateProject, addMember } from '../controllers/projectControllers.js';

const projectRouter = express.Router();

projectRouter.post('/', createProject);
projectRouter.put('/:projectId', updateProject);
projectRouter.post('/:projectId/addMember', addMember);

export default projectRouter;
