import prisma from '../src/db.js'

export const getUserWorkspace = async (req, res) => {
    try {
        const { userId } = await req.auth()

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        const workspace = await prisma.workspace.findMany({
            where: {
                members: { some: { userId: userId } }
            },
            include: {
                members: {
                    include: { user: true }
                },
                projects: {
                    include: {
                        tasks: {
                            include: {
                                assignee: true,
                                comments: { include: { user: true } }
                            }
                        },
                        members: { include: { user: true } }
                    }
                },
                owner: true
            }
        })

         return res.json({ workspaces: workspace })
    } catch (err) {
        console.error(err)
        return res.status(500).json({ message: err?.message || 'Internal server error' })
    }
}

//add  members to workspace
export const addMember = async (req, res) => {
    try{
        const {userId} = await req.auth()
        const {email,role,workspaceId,message} = req.body
        //check if user exist
        const user = await prisma.user.findUnique({
            where: { email }
        })
        if(!user){
            return res.status(404).json({ message: 'User not found' })

        }
        if(!workspaceId || !role){
            return res.status(400).json({ message: 'missing required parameters' })

        }
        if(!["ADMIN","MEMBER"].includes(role)){
            return res.status(400).json({ message: 'Invalid role' })
        }
        //fetch workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: true }
        })
        if(!workspace){
            return res.status(404).json({ message: 'Workspace not found' })
        }
        //creator has admin role
        if(!workspace.members.find((member)=>member.userId === userId && member.role === "ADMIN")){
            return res.status(401).json({ message: 'You are not authorized to add members to this workspace' })
        }
        
        //check if user is already a member
        const existingMember = workspace.members.find((member)=>member.userId === user.id)
        if(existingMember){
            return res.status(400).json({ message: 'User is already a member of this workspace' })
        }

        const member = await prisma.workspaceMember.create({
            data:{
                userId: user.id,
                workspaceId: workspace.id,
                role,
                message
            }
        })
        res.json({ message: 'Member added successfully', member })
    }catch(err){
        console.error(err)
        return res.status(500).json({ message: err.code ||err?.message || 'Internal server error' })
    }
}