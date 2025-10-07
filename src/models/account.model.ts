import mongoose, { Document, Schema } from "mongoose";
//Schema → defines how documents are structured.

//Document → the base TypeScript type for MongoDB documents (includes _id, timestamps, etc.).
import { ProviderEnumType, ProviderEnum } from "../enums/account-provider.enum";

export interface AccountDocument extends Document {
  provider: ProviderEnumType;
  providerId: string; // Store the email, googleId, facebookId as the providerId
  userId: mongoose.Types.ObjectId;
  refreshToken: string | null;
  tokenExpiry: Date | null;
  createAt: Date;
}

const accountSchema = new Schema<AccountDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: String,
      enum: Object.values(ProviderEnum),
      required: true,
    },
    providerId: { type: String, required: true, unique: true },
    refreshToken: { type: String, default: null },
    tokenExpiry: { type: Date, default: null },
  },
  {
    timestamps: true, // auto updatedAt and createdAt
    toJSON: {
      transform(doc, ret) {
        //Mongoose provides options like toJSON and toObject to customize how your document looks when it’s converted into a plain object or JSON — such as before sending it in an API response.
        //  Plain JSON object (after transform)
        //This is a special callback function that lets you modify the output object before it’s returned.
        //doc → The original Mongoose document.
        // ret → The plain object version (the one that will be sent out).

        delete ret.refreshToken;
        //This removes the refreshToken field from the object that will be returned when the document is serialized.
      },
    },
  }
);

const AccountModel = mongoose.model<AccountDocument>("Account", accountSchema);

export default AccountModel;
