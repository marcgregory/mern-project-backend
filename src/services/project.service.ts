import mongoose from "mongoose";
import ProjectModel from "../models/project.model";
import TaskModel from "../models/task.model";
import { NotFoundException } from "../utils/appError";
import { TaskStatusEnum } from "../enums/task.enum";

export const createProjectService = async (
  userId: string,
  workspaceId: string,
  body: {
    emoji?: string;
    name: string;
    description?: string;
  }
) => {
  const project = new ProjectModel({
    ...(body.emoji && { emoji: body.emoji }), // ignores when false using spread operators
    name: body.name,
    description: body.description,
    workspace: workspaceId,
    createdBy: userId,
  });

  await project.save();
  return {
    project,
  };
};

export const getProjectsInWorkspaceService = async (
  workspaceId: string,
  pageSize: number,
  pageNumber: number
) => {
  const totalCount = await ProjectModel.countDocuments({
    workspace: workspaceId,
  });

  const skip = (pageNumber - 1) * pageSize; // So pageNumber 1 skips 0, pageNumber 2 skips pageSize(10 items), pageNumber 3 skips 20 starts 21 etc.
  //computations: at pageNumber 3 example
  //skip = (3 - 1) * 10
  // skip = 2 * 10
  // skip = 20

  const projects = await ProjectModel.find({ workspace: workspaceId })
    .skip(skip) // skip the first page 10 times(pageSize = 10) and start at 11 (example page 2)
    .limit(pageSize)
    .populate("createdBy", "_id name profilePicture -password") //populate() replaces an ObjectId reference with the actual document data from another collection.
    .sort({ createdAt: -1 }); //-1 = descending , 1 = ascending

  const totalPages = Math.ceil(totalCount / pageSize); //“Round up to the nearest whole number 4.1 to 5

  return { projects, totalCount, totalPages, skip };
};

export const getProjectByIdAndWorkspaceIdService = async (
  workspaceId: string,
  projectId: string
) => {
  const project = await ProjectModel.findOne({
    _id: projectId,
    workspace: workspaceId,
  }).select("_id emoji name description");

  if (!project) {
    throw new NotFoundException(
      "Project not found or does not belong to the specified workspace"
    );
  }

  return { project };
};

export const getProjectAnalyticsService = async (
  workspaceId: string,
  projectId: string
) => {
  const project = await ProjectModel.findById(projectId);

  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    //By calling .toString() (or .equals()), you ensure both sides are compared as strings: not ObjectId
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  const currentDate = new Date();

  const taskAnalytics = await TaskModel.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId), // $match → filters tasks by project ID
      },
    },
    {
      $facet: {
        //$facet → runs 3 counts in parallel:
        //the $facet stage in MongoDB lets you perform multiple separate
        // aggregations on the same dataset at once — in a single query.
        totalTasks: [{ $count: "count" }],
        overdueTasks: [
          {
            $match: {
              dueDate: { $lt: currentDate },
              status: {
                $ne: TaskStatusEnum.DONE,
              },
            },
          },
          {
            $count: "count", // count not yet done status
          },
        ],
        completedTasks: [
          {
            $match: {
              status: TaskStatusEnum.DONE,
            },
          },
          { $count: "count" }, // count the Done status
        ],
      },
    },
  ]);

  // aggregate code returns object like this {
  // totalTasks: [{ count: 10 }],
  // overdueTasks: [{ count: 3 }],
  // completedTasks: [{ count: 5 }]
  // }

  const _analytics = taskAnalytics[0]; // Since that’s an array with one object, you access the first (and only) element using [0]:

  const analytics = {
    totalTasks: _analytics.totalTasks[0]?.count || 0,
    overdueTasks: _analytics.overdueTasks[0]?.count || 0,
    completedTasks: _analytics.completedTasks[0]?.count || 0,
  };

  return {
    analytics,
  };
};

export const updateProjectServices = async (
  workspaceId: string,
  projectId: string,
  body: { emoji?: string; name: string; description?: string }
) => {
  const { name, emoji, description } = body;

  const project = await ProjectModel.findOne({
    _id: projectId,
    workspace: workspaceId,
  });

  if (!project) {
    throw new NotFoundException(
      "Project not found or does not belong to the specified workspace"
    );
  }

  if (emoji) project.emoji = emoji;
  if (name) project.name = name;
  if (description) project.description = description;

  await project.save();

  return { project };
};

export const deleteProjectService = async (
  workspaceId: string,
  projectId: string
) => {
  const project = await ProjectModel.findOne({
    _id: projectId,
    workspace: workspaceId,
  });

  if (!project) {
    throw new NotFoundException(
      "Project not found or does not belong to the specified workspace"
    );
  }

  await project.deleteOne();

  await TaskModel.deleteMany({ project: project._id });

  return project;
};
