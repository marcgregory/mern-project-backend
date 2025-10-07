import mongoose, { Document, Schema } from "mongoose";
//Schema → defines how documents are structured.

//Document → the base TypeScript type for MongoDB documents (includes _id, timestamps, etc.).
import { generateInviteCode } from "../utils/uuid";
export interface WorkspaceDocument extends Document {
  name: string;
  description: string;
  owner: mongoose.Types.ObjectId;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

const workspaceSchema = new Schema<WorkspaceDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: false },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      default: generateInviteCode,
    },
  },
  { timestamps: true }
);

workspaceSchema.methods.resetInviteCode = function () {
  // methods - Any function you add here becomes available on instances of the model.
  this.inviteCode = generateInviteCode();
};

const WorkspaceModel = mongoose.model<WorkspaceDocument>(
  "Workspace",
  workspaceSchema
);

export default WorkspaceModel;
