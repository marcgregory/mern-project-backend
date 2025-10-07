import "dotenv/config";
import mongoose from "mongoose";
import connectDatabase from "../config/database.config";
import RoleModel from "../models/roles-permission.model";
import { RolePermissions } from "../utils/role-permission";

const seedRoles = async () => {
  console.log("Seeding roles started");
  try {
    await connectDatabase();

    const connection = mongoose.connection as any;

    const supportsTransactions =
      connection.readyState === 1 &&
      connection.client?.topology?.description?.type !== "Single";
    let session: mongoose.ClientSession | null = null;
    if (supportsTransactions) {
      // session does not work on local DB that's why we check if supported
      session = await mongoose.startSession(); // A session is required if you want to use MongoDB transactions, which let you treat multiple database operations as a single unit — either all succeed or all fail.
      session.startTransaction(); // Starts a transaction within the session. A set of operations (like insert, update, delete) that are atomic — meaning either all changes are applied or none are.
      console.log("✅ Transactions supported — using session");
    } else {
      console.log("⚠️ Transactions not supported — running without session");
    }
    console.log("Clearing existing roles...");
    await RoleModel.deleteMany({}, session ? { session } : {}); // {session} Options object. Passing session ties this operation to the current transaction session, so it becomes atomic.
    for (const roleName in RolePermissions) {
      // roleName is key
      const role = roleName as keyof typeof RolePermissions;
      const permissions = RolePermissions[role];

      //Check if the role already exists

      const existingRole = session
        ? await RoleModel.findOne({ name: role }).session(session) //session here - Attaches this query to the active MongoDB session (which is part of a transaction).
        : await RoleModel.findOne({ name: role });

      if (!existingRole) {
        const newRole = new RoleModel({ name: role, permissions: permissions });
        await newRole.save(session ? { session } : {}); //session here - An options object that attaches this operation to a specific MongoDB session (usually for transactions).
        console.log(`Role ${role} added with permission.`);
      } else {
        console.log(`Role ${role} already exists.`);
      }
    }

    if (session) {
      await session.commitTransaction(); // Finalizes (commits) the transaction
      // All operations performed in this session — inserts, updates, deletes — are now permanently written to the database.
      console.log("Transaction committed");
      session.endSession(); // Closes the MongoDB session.
      console.log("session ended.");
      console.log("Seeding completed successfully");
    }
  } catch (error) {
    console.error("Error during seeding", error);
  }
};

// Run the seeding script and handle any unhandled errors
seedRoles().catch((error) =>
  console.error("Error running seed script:", error)
);
