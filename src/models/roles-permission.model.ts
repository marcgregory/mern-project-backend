import mongoose, { Schema, Document } from "mongoose";
import {
  Permissions,
  PermissionType,
  Roles,
  RoleType,
} from "../enums/role.enum";
import { RolePermissions } from "../utils/role-permission";
//Schema → defines how documents are structured.

//Document → the base TypeScript type for MongoDB documents (includes _id, timestamps, etc.).

export interface RoleDocument extends Document {
  name: RoleType;
  permissions: Array<PermissionType>;
}

const roleSchema = new Schema<RoleDocument>(
  {
    name: {
      type: String,
      enum: Object.values(Roles),
      required: true,
      unique: true,
    },
    permissions: {
      type: [String],
      enum: Object.values(Permissions),
      required: true,
      default: function (this: RoleDocument) {
        //the this: RoleDocument part is not an argument — it’s a TypeScript type annotation that tells the compiler what the this keyword refers to inside the function.
        //Inside a Mongoose schema method or default function, this refers to the document being created or modified.
        //But TypeScript doesn’t automatically know what type this is — so we help it by saying:
        //“Inside this function, this will be a RoleDocument.”
        return RolePermissions[this.name];
      },
    },
  },
  { timestamps: true }
);

const RoleModel = mongoose.model("Role", roleSchema);

export default RoleModel;
