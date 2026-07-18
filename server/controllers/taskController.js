import { inngest } from '../inngest/index.js';
import prisma from '../src/db.js';

// create task
export const createTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const { projectId, title, description, assigneeId, type, status, due_date } = req.body;

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have permission to create task for this project" });
        }
        if (assigneeId && !project.members.find(member => member.userId === assigneeId)) {
            return res.status(403).json({ message: 'Assignee is not a member of this project' });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                type,
                assigneeId,
                status,
                due_date: due_date ? new Date(due_date) : null,
            }
        });

        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true }
        });
        await inngest.send({
            name: "app/task.assigned",
            data:{
                taskId:task.id,origin
            }
        })

        res.json({ task: taskWithAssignee, message: 'Task created successfully' });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: err?.message || 'Internal server error' });
    }
};

// update task
export const updateTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const task = await prisma.task.findUnique({
            where: { id: req.params.id }
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have permission to create task for this project" });
        }

        const updatedTask = await prisma.task.update({
            where: { id: req.params.id },
            data: req.body
        });

        res.json({ task: updatedTask, message: 'Task updated successfully' });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: err?.message || 'Internal server error' });
    }
};

// delete task
export const deleteTask = async (req, res) => {
    try {
        const { userId } = await req.auth();
        const task = await prisma.task.findUnique({
            where: { id: req.params.id }
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: { members: { include: { user: true } } }
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have permission to create task for this project" });
        }

        await prisma.task.delete({
            where: { id: req.params.id }
        });

        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: err?.message || 'Internal server error' });
    }
};