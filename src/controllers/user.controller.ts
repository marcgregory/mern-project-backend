import { Response, Request } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { getCurrentUserService } from "../services/user.service";

export const getCurrentUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id; // req.user is added by Passport - passport.authenticate("local", ...); Stores the user’s unique ID in the session (not the whole object).
    //done(null, user); in the config -  Passport stores this user in the session

    const { user } = await getCurrentUserService(userId);

    return res
      .status(HTTPSTATUS.OK)
      .json({ message: "User fetch successfully", user });
  }
);
