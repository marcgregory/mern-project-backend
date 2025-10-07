import mongoose, { Document, Schema } from "mongoose";
import { compareValue, hashValue } from "../utils/bcrypt";

export interface UserDocument extends Document {
  name: string;
  email: string;
  password?: string;
  profilePicture: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createAt: Date;
  updatedAt: Date;
  currentWorkspace: mongoose.Types.ObjectId | null;
  comparePassword(value: string): Promise<boolean>;
  omitPassword(): Omit<UserDocument, "password">; //typescript omit - It omits the password field, making it safe to send to the frontend or API responses.
}

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: false,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      select: true, // that controls whether it shows up in query results by default.
    },
    profilePicture: {
      type: String,
      default: null,
    },
    currentWorkspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
    },
    isActive: { type: Boolean, default: true },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  //save - Built-in Mongoose method that persists documents to MongoDB
  // pre("save") -  A hook that runs before the document is saved
  if (this.isModified("password")) {
    // isModified() is a built-in Mongoose document method
    //This method checks if a specific field (like "password") was changed or newly set since the document was last loaded or created.
    if (this.password) {
      this.password = await hashValue(this.password);
    }
  }
  next();
});

userSchema.methods.omitPassword = function (): Omit<UserDocument, "password"> {
  // In Mongoose, .methods is where you define custom instance methods that all documents of that model can use.
  //Omit<UserDocument, "password"> - This method returns a version of the user document without the password field in the type system.
  const userObject = this.toObject();
  //this  // Mongoose Document instance
  // .toObject() converts the Mongoose document into a plain JavaScript object, stripping out internal Mongoose stuff (like functions, getters/setters, etc.).
  delete userObject.password;
  //Physically removes the password property from the object.
  // Even if it was selected in the query, it won’t appear in the returned object anymore.
  return userObject;
};

userSchema.methods.comparePassword = async function (value: string) {
  return compareValue(value, this.password);
};

const UserModel = mongoose.model<UserDocument>("User", userSchema);

export default UserModel;
