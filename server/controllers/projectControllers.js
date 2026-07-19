import prisma from '../src/db.js'
//create project
export const createProject= async (req,res)=>{
    try{
          const {userId} = await req.auth()
        const {
            workspaceId,
            name,
            description,
            status,
            start_date,
            end_date,
            team_members,
            team_lead,
            progress,
            priority
        } = req.body

        const startDate = req.body.start_Date ?? start_date
        const endDate = req.body.end_Date ?? end_date
        const teamMembers = req.body.team_Members ?? team_members
        const teamLeadEmail = req.body.team_Lead ?? team_lead

        //check if the user has a admnin role in the workspace
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: {include: { user: true } } }
        })
        if(!workspace){
            return res.status(404).json({message:'Workspace not found'})
        }
        if(!workspace.members.some(member => member.userId === userId && member.role === 'ADMIN')){
            return res.status(403).json({message:'Yyou dont have permission to create project in this workspace'})
        }

        if(!teamLeadEmail){
            return res.status(400).json({message:'Please select a team lead'})
        }

        //get TeamLead using email
        const teamLead = await prisma.user.findUnique({
            where: { email: teamLeadEmail },
            select: { id: true }

        })

        if(!teamLead){
            return res.status(404).json({message:'Selected team lead not found'})
        }

        const project = await prisma.project.create({
            data:{
                    workspaceId,
                    name,
                    description,
                    status,
                    priority,
                    progress,
                    team_lead: teamLead.id,
                    start_date: startDate ? new Date(startDate) : null,
                    end_date: endDate ? new Date(endDate) : null,
                    
            }
        })

        //add team members to project if they are in a workspace
        if( teamMembers?.length > 0){
            const membersToAdd = []
            workspace.members.forEach(member=>{
                if(teamMembers.includes(member.user.email)){
                    membersToAdd.push(member.user.id)
                }
            })
             await prisma.projectMember.createMany({
                data: membersToAdd.map(memberId=>({
                    projectId:project.id,
                    userId:memberId

                }))
             })

        }

        const projectWithMembers = await prisma.project.findUnique({
            where: { id: project.id },
            include:{
                members:{include:{user:true}},
                tasks:{include:{comments:{include:{user:true}}}},
                owner:true
            }
        })
        res.json({project:projectWithMembers,message:'Project created successfully'})
       

    }catch(err){
        console.log(err)
        return res.status(500).json({message:err?.message || 'Internal server error'})
    }
}

//update project
export const updateProject= async (req,res)=>{
    try{
      const {userId} = await req.auth()
       const{id,workspaceId,name,description,status,start_Date,end_Date,progress,priority}=req.body
       
       //check if the user has a admnin role in the workspace

       const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: {include: { user: true } } }
        })

        if(!workspace){
            return res.status(404).json({message:'Workspace not found'})
        }

        if(!workspace.members.some(member => member.userId === userId && member.role === 'ADMIN')){
            const project = await prisma.project.findUnique({
                where: { id },
               
            })
            if(!project){
                return res.status(404).json({message:'Project not found'})
            }else if(project.team_lead !== userId){
                return res.status(403).json({message:'You dont have permission to update this project'})
            }
        }
        const project = await prisma.project.update({
            where: { id },
            data:{
                workspaceId,
                name,
                description,
                status,
                 priority,
                progress,
                start_Date:start_Date ? new Date(start_Date) : null,
                end_Date:end_Date ? new Date(end_Date) : null,
            }
        })
        res.json({project,message:'Project updated successfully'})



    }catch(err){
        console.log(err)
        return res.status(500).json({message:err?.message || 'Internal server error'})
    }
}

//add members to project

export const addMember= async (req,res)=>{
    try{
        const {userId} = await req.auth()
        const{projectId}=req.params
        const{email}=req.body

        //check if use has a project lead
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: {include:{user:true}} }
        })

    if (!project){
        return res.status(404).json({message:'Project not found'})
    }
    if(project.team_lead !== userId){
        return res.status(403).json({message:'Only team lead can add members to this project'})

    }
    //check user is already a member of the project

    const existingMember = project.members.find(member => member.user.email === email)
    if(existingMember){
        return res.status(400).json({message:'User is already a member of this project'})

    }
    const user = await prisma.user.findUnique({
        where: { email }
    })
    if(!user){
        return res.status(404).json({message:'User not found'})
    }
    const member = await prisma.projectMember.create({
        data:{
            projectId:project.id,
            userId:user.id
        }
    })
    res.json({message:'Member added successfully',member
    })
}
    
    catch(err){
        console.log(err)
        return res.status(500).json({message:err?.message || 'Internal server error'})
    }
}