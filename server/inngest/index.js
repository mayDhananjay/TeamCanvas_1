import { Inngest } from "inngest";
import prisma from '../src/db.js'
import sendEmail from "../src/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "TeamCanvas" });


// Inngest function to save user data to a database
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: { event: "clerk/user.created" },
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.create({
      data: {
        id: data.id,
        email: data.email_addresses?.[0]?.email_address,
        name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
        image: data?.image_url,
      },
    });
  }
);

// Inngest function to delete the user data
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-from-clerk",
    triggers: { event: "clerk/user.deleted" },
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.delete({
      where: {
        id: data.id,
      },
    });
  }
);


//ingest function to update the user data
const syncUserUpdate = inngest.createFunction(
  {
    id: "sync-user-update-from-clerk",
    triggers: { event: "clerk/user.updated" },
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.user.update({
      where: {
        id: data.id,
      },
      data: {
        email: data.email_addresses?.[0]?.email_address,
        name: `${data?.first_name ?? ""} ${data?.last_name ?? ""}`.trim(),
        image: data?.image_url,
      },
    });
  }
);


// Inngest function to save workspace data to a database
const syncWorkspaceCreation = inngest.createFunction(
  {
    id: "sync-workspace-from-clerk",
    triggers: { event: "clerk/organization.created" },
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.create({
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });
    // Add creator as an admin member
    await prisma.workspaceMember.create({
      data: {
        userId: data.created_by,
        workspaceId: data.id,
        role: "ADMIN",
      },
    });
  }
);
// Inngest function to update the workspace data
const syncWorkspaceUpdate = inngest.createFunction(
  {
    id: "sync-workspace-update-from-clerk",
    triggers: { event: "clerk/organization.updated" },
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        slug: data.slug,
        ownerId: data.created_by,
        image_url: data.image_url,
      },
    });
  }
);

// Inngest function to delete the workspace data
const syncWorkspaceDeletion = inngest.createFunction(
  {
    id: "sync-workspace-deletion-from-clerk",
    triggers: { event: "clerk/organization.deleted" },
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspace.delete({
      where: {
        id: data.id,
      },
    });
  }
);

// Inngest function to save workspace member data to a database
const syncWorkspaceMemberCreation = inngest.createFunction(
  {
    id: "sync-workspace-member-from-clerk",
    triggers: { event: "clerk/organization.membership.created" },
  },
  async ({ event }) => {
    const { data } = event;
    await prisma.workspaceMember.create({
      data: {
        userId: data.user_id,
        workspaceId: data.organization_id,
        role: String(data.role_name).toUpperCase(),
      },
    });
  }
);

//Inngest function to send Emil on task Creation
const sendTaskAssignmentEmail = inngest.createFunction(
  {
    id: "send-task-assignment-mail",
    triggers: [{ event: "api/task.assigned" }],
  },
  async ({ event, step }) => {
    const { taskId, origin } = event.data;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignee: true, project: true }
    })
    await sendEmail({
      to: task.assignee.email,
      subject: `New Task Assignment in ${task.project.name}`,
      body: `
    <div style="font-family: Arial, Helvetica, sans-serif; background:#f4f6f9; padding:40px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.1);">

        <div style="background:#2563eb; padding:20px; text-align:center;">
          <h1 style="color:#ffffff; margin:0;">New Task Assigned</h1>
        </div>

        <div style="padding:30px; color:#333333;">

          <h2 style="margin-top:0;">Hi ${task.assignee.name}, 👋</h2>

          <p style="font-size:16px; line-height:1.6;">
            You have been assigned a new task in the project
            <strong>${task.project.name}</strong>.
          </p>

          <div style="background:#f8fafc; border-left:4px solid #2563eb; padding:20px; margin:25px 0;">

            <p style="margin:0 0 10px;">
              <strong>Task:</strong><br>
              ${task.title}
            </p>

            <p style="margin:0 0 10px;">
              <strong>Description:</strong><br>
              ${task.description || "No description provided."}
            </p>

            <p style="margin:0;">
              <strong>Due Date:</strong><br>
              ${new Date(task.due_date).toLocaleDateString()}
            </p>

          </div>

          <div style="text-align:center; margin:35px 0;">
            <a
              href="${origin}"
              style="
                display:inline-block;
                background:#2563eb;
                color:#ffffff;
                text-decoration:none;
                padding:14px 28px;
                border-radius:6px;
                font-weight:bold;
              "
            >
              View Task
            </a>
          </div>

          <p style="font-size:14px; color:#666666; line-height:1.6;">
            Please review the task details and begin working on it as soon as possible.
          </p>

          <p style="margin-top:30px;">
            Best Regards,<br>
            <strong>Project Management Team</strong>
          </p>

        </div>

        <div style="background:#f3f4f6; padding:15px; text-align:center; font-size:12px; color:#777777;">
          This is an automated email. Please do not reply.
        </div>

      </div>
    </div>
  `
    })

    if (new Date(task.due_date).toLocaleDateString() !== new Date().toDateString()) {
      await step.sleepUntil('wait-for-the-due-date ', new Date(task.due_date))
      await step.run('check-if-task-is-completed', async () => {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { assignee: true, project: true }
        })
        if (!task) return;
        if (task.status !== "DONE") {
          await step.run('send-task-reminder-mail', async () => {
            await sendEmail({
              to: TaskSignal.assignee.email,
              subject: `Reminder For ${AgentTask.project.name}`,
              body: `
<div style="font-family: Arial, Helvetica, sans-serif; background:#f4f6f9; padding:40px;">
  <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 4px 10px rgba(0,0,0,0.08);">

    <div style="background:#f59e0b; padding:20px; text-align:center;">
      <h1 style="margin:0; color:#ffffff;">
        ⏰ Task Reminder
      </h1>
    </div>

    <div style="padding:30px; color:#333333;">

      <h2 style="margin-top:0;">
        Hi ${task.assignee.name},
      </h2>

      <p style="font-size:16px; line-height:1.6;">
        This is a friendly reminder that the following task is still
        <strong>pending</strong> and has not been marked as completed.
      </p>

      <div style="background:#fff7ed; border-left:4px solid #f59e0b; padding:20px; margin:25px 0;">

        <p style="margin:0 0 12px;">
          <strong>📁 Project:</strong><br>
          ${task.project.name}
        </p>

        <p style="margin:0 0 12px;">
          <strong>📝 Task:</strong><br>
          ${task.title}
        </p>

        <p style="margin:0 0 12px;">
          <strong>📄 Description:</strong><br>
          ${task.description || "No description available."}
        </p>

        <p style="margin:0 0 12px;">
          <strong>📅 Due Date:</strong><br>
          ${new Date(task.due_date).toLocaleDateString()}
        </p>

        <p style="margin:0;">
          <strong>📌 Current Status:</strong>
          ${task.status}
        </p>

      </div>

      <div style="text-align:center; margin:35px 0;">
        <a
          href="${origin}"
          style="
            display:inline-block;
            background:#f59e0b;
            color:#ffffff;
            text-decoration:none;
            padding:14px 30px;
            border-radius:6px;
            font-weight:bold;
          "
        >
          View Task
        </a>
      </div>

      <p style="font-size:15px; color:#555555; line-height:1.6;">
        Please update the task status once you've made progress or completed it.
        If you're facing any blockers, inform your team lead or project manager.
      </p>

      <p style="margin-top:30px;">
        Regards,<br>
        <strong>Project Management Team</strong>
      </p>

    </div>

    <div style="background:#f3f4f6; padding:15px; text-align:center; font-size:12px; color:#777;">
      This is an automated reminder email. Please do not reply.
    </div>

  </div>
</div>
`
            })
          })
        }


      })

    }
  }

)

export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdate, syncWorkspaceCreation, syncWorkspaceUpdate,
  syncWorkspaceDeletion, syncWorkspaceMemberCreation,sendTaskAssignmentEmail
];