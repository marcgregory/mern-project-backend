import mongoose from "mongoose";
import UserModel from "../models/user.model";
import AccountModel from "../models/account.model";
import WorkspaceModel from "../models/workspace.model";
import RoleModel from "../models/roles-permission.model";
import { Roles } from "../enums/role.enum";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "../utils/appError";
import MemberModel from "../models/member.model";
import { ProviderEnum } from "../enums/account-provider.enum";

const supportsTransactionsCheck = () => {
  const connection = mongoose.connection as any;

  return (
    connection.readyState === 1 &&
    connection.client?.topology?.description?.type !== "Single"
  );
};

export const loginOrCreateAccountService = async (data: {
  provider: string;
  displayName: string;
  providerId: string;
  picture?: string;
  email?: string;
}) => {
  const { providerId, provider, displayName, email, picture } = data;

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

    let user = session
      ? await UserModel.findOne({ email }).session(session)
      : await UserModel.findOne({ email });

    if (!user) {
      // Create a new user if it doesn't exist
      user = new UserModel({
        email,
        name: displayName,
        profilePicture: picture || null,
      });

      await user.save(session ? { session } : {});

      const account = new AccountModel({
        userId: user._id,
        provider: provider,
        providerId: providerId,
      });

      await account.save(session ? { session } : {});
      // 3. Create a new workspace for the new user
      const workspace = new WorkspaceModel({
        name: `My Workspace`,
        description: `Workspace created for ${user.name}`,
        owner: user._id,
      });
      await workspace.save(session ? { session } : {});

      const ownerRole = session
        ? await RoleModel.findOne({ name: Roles.OWNER }).session(session)
        : await RoleModel.findOne({ name: Roles.OWNER });

      if (!ownerRole) {
        throw new NotFoundException("Owner role not found");
      }

      const member = new MemberModel({
        userId: user._id,
        workspaceId: workspace._id,
        role: ownerRole._id,
        joinedAt: new Date(),
      });

      await member.save(session ? { session } : {});
      user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
      await user.save(session ? { session } : {});
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
      console.log("End Session...");
    }

    return { user };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

export const registerUserService = async (body: {
  email: string;
  name: string;
  password: string;
}) => {
  const { email, name, password } = body;

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

    const existingUser = session
      ? await UserModel.findOne({ email }).session(session)
      : await UserModel.findOne({ email });

    if (existingUser) {
      throw new BadRequestException("Email already exists");
    }

    const user = new UserModel({ email, name, password });

    await user.save(session ? { session } : {});

    const account = new AccountModel({
      userId: user._id,
      provider: ProviderEnum.EMAIL,
      providerId: email,
    });

    await account.save(session ? { session } : {});

    // 3. Create a new workspace for the new user

    const workspace = new WorkspaceModel({
      name: `My Workspace`,
      description: `Workspace created for ${user.name}`,
      owner: user._id,
    });

    await workspace.save(session ? { session } : {});

    const ownerRole = session
      ? await RoleModel.findOne({ name: Roles.OWNER }).session(session)
      : await RoleModel.findOne({ name: Roles.OWNER });

    if (!ownerRole) {
      throw new NotFoundException("Owner role not found");
    }

    const member = new MemberModel({
      userId: user._id,
      workspaceId: workspace._id,
      role: ownerRole._id,
      joinedAt: new Date(),
    });
    await member.save(session ? { session } : {});
    user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
    await user.save(session ? { session } : {});

    if (session) {
      await session.commitTransaction();
      session.endSession();
      console.log("End Session...");
    }

    return {
      userId: user._id,
      workspaceId: workspace._id,
    };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
};

export const verifyUserService = async ({
  email,
  password,
  provider = ProviderEnum.EMAIL,
}: {
  email: string;
  password: string;
  provider?: string;
}) => {
  const account = await AccountModel.findOne({ provider, providerId: email });
  if (!account) {
    throw new NotFoundException("Invalid email or password");
  }

  const user = await UserModel.findById(account.userId);

  if (!user) {
    throw new NotFoundException("User not found for the given account");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new UnauthorizedException("Invalid email or password");
  }

  return user.omitPassword();
};
