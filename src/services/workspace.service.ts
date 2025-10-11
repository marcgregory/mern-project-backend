import mongoose from "mongoose";
import { Roles } from "../enums/role.enum";
import MemberModel from "../models/member.model";
import RoleModel from "../models/roles-permission.model";
import UserModel from "../models/user.model";
import WorkspaceModel from "../models/workspace.model";
import { BadRequestException, NotFoundException } from "../utils/appError";
import TaskModel from "../models/task.model";
import { TaskStatusEnum } from "../enums/task.enum";
import ProjectModel from "../models/project.model";
import { supportsTransactionsCheck } from "../utils/sessionCheckSupport";

export const createWorkspaceService = async (
  userId: string,
  body: {
    name: string;
    description?: string | undefined;
  }
) => {
  const { name, description } = body;

  const user = await UserModel.findById(userId);

  if (!user) {
    throw new NotFoundException("User not found");
  }

  const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });

  if (!ownerRole) {
    throw new NotFoundException("Owner role not found");
  }

  const workspace = new WorkspaceModel({
    name: name,
    description: description,
    owner: user._id,
  });

  await workspace.save();

  const member = new MemberModel({
    userId: user._id,
    workspaceId: workspace._id,
    role: ownerRole._id,
    joinedAt: new Date(),
  });

  await member.save();

  user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
  await user.save();

  return {
    workspace,
  };
};

export const getAllWorkspacesUserIsMemberService = async (userId: string) => {
  const memberships = await MemberModel.find({ userId })
    .populate("workspaceId")
    .select("-password")
    .exec(); // exec here -  it depends on you but not required

  const workspaces = memberships.map((membership) => membership.workspaceId);
  return { workspaces };
};

export const getWorkspaceByIdService = async (workspaceId: string) => {
  const workspace = await WorkspaceModel.findById(workspaceId);

  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const members = await MemberModel.find({ workspaceId }).populate("role");

  const workspaceWithMembers = { ...workspace.toObject(), members }; // workspace.toObject() removes all the Mongoose-specific stuff and returns a clean JSON-like object you can safely spread

  return { workspace: workspaceWithMembers };
};

export const getWorkspaceMembersService = async (workspaceId: string) => {
  const members = await MemberModel.find({ workspaceId })
    .populate("userId", "name email profilePicture -password") // selects specific fields: name, email, and profilePicture, while excluding (-) the password field for security.
    .populate("role", "name");

  const roles = await RoleModel.find({}, { name: 1, _id: 1 }) // {} - Finds all roles from the RoleModel collection, but only includes name and _id fields.
    .select("-permission") //excludes the permission field
    .lean(); //Converts the Mongoose documents into plain JavaScript objects, not full Mongoose instances., The result becomes lightweight and faster
  //apply it - If you’re only reading data and returning it to the client
  return {
    members,
    roles,
  };
};

export const getWorkspaceAnalyticsService = async (workspaceId: string) => {
  const currentDate = new Date();

  const totalTasks = await TaskModel.countDocuments({ workspace: workspaceId });

  const overdueTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
    dueDate: { $lt: currentDate }, // means dueDate < now ($lt = “less than”)
    status: { $ne: TaskStatusEnum.DONE }, // not done yet ($ne = “not equal”).
  });

  const completedTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
    status: TaskStatusEnum.DONE,
  });

  const analytics = {
    totalTasks,
    overdueTasks,
    completedTasks,
  };

  return { analytics };
};

export const changeMemberRoleService = async (
  workspaceId: string,
  memberId: string,
  roleId: string
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const role = await RoleModel.findById(roleId);
  if (!role) {
    throw new NotFoundException("Role not found");
  }

  const member = await MemberModel.findOne({
    userId: memberId,
    workspaceId: workspaceId,
  });

  if (!member) {
    throw new Error("Member not found in the workspace");
  }

  member.role = role; // role created property

  await member.save();

  return { member };
};

export const updateWorkspaceByIdService = async (
  workspaceId: string,
  name: string,
  description?: string
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  workspace.name = name || workspace.name;
  workspace.description = description || workspace.description;
  await workspace.save();

  return { workspace };
};
//You use a transaction when multiple related writes need to happen safely(session)
// Other parts of your app — like:

// login/logout

// get user info

// analytics counts

// reading data (find, countDocuments, etc.)

// — only involve reading or a single write operation.

// These are atomic by nature — MongoDB already ensures that a single document write (e.g., updateOne, create) is safe.
// So you don’t need a session or transaction.
export const deleteWorkspaceService = async (
  workspaceId: string,
  userId: string
) => {
  let session: mongoose.ClientSession | null = null;

  try {
    if (supportsTransactionsCheck()) {
      // session does not work on local DB that's why we check if supported
      session = await mongoose.startSession(); // A session is required if you want to use MongoDB transactions, which let you treat multiple database operations as a single unit — either all succeed or all fail.
      session.startTransaction(); // Starts a transaction within the session. A set of operations (like insert, update, delete) that are atomic — meaning either all changes are applied or none are.
      console.log("✅ Transactions supported — using session");
    } else {
      console.log("⚠️ Transactions not supported — running without session");
    }
    const workspace = session
      ? await WorkspaceModel.findById(workspaceId).session(session)
      : await WorkspaceModel.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    if (!workspace.owner.equals(new mongoose.Types.ObjectId(userId))) {
      throw new BadRequestException(
        "You are not authorized to delete this workspace"
      );
    }

    const user = session
      ? await UserModel.findById(userId).session(session)
      : await UserModel.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    session
      ? await ProjectModel.deleteMany({ workspace: workspace._id }).session(
          session
        )
      : await ProjectModel.deleteMany({ workspace: workspace._id });

    session
      ? await TaskModel.deleteMany({ workspace: workspace._id }).session(
          session
        )
      : await TaskModel.deleteMany({ workspace: workspace._id });
    session
      ? await MemberModel.deleteMany({
          workspaceId: workspace._id,
        }).session(session)
      : await MemberModel.deleteMany({
          workspaceId: workspace._id,
        });

    // Update the user's currentWorkspace if it matches the deleted workspace
    if (user?.currentWorkspace?.equals(workspaceId)) {
      const memberWorkspace = session
        ? await MemberModel.findOne({ userId }).session(session)
        : await MemberModel.findOne({ userId });
      // Update the user's currentWorkspace
      user.currentWorkspace = memberWorkspace
        ? memberWorkspace.workspaceId
        : null;

      await user.save(session ? { session } : {});
    }

    session
      ? await workspace.deleteOne({ session })
      : await workspace.deleteOne;
    if (session) {
      await session.commitTransaction();
      session.endSession();
    }
    return {
      currentWorkspace: user.currentWorkspace,
    };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};
