import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { config } from "../config/app.config";
import { registerSchema } from "../validation/auth.validation";
import { HTTPSTATUS } from "../config/http.config";
import { registerUserService } from "../services/auth.service";
import passport from "passport";

export const googleLoginCallback = asyncHandler(
  async (req: Request, res: Response) => {
    const currentWorkspace = req.user?.currentWorkspace;
    if (!currentWorkspace) {
      return res.redirect(
        `${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=failure`
      );
    }
    return res.redirect(
      `${config.FRONTEND_ORIGIN}/workspace/${currentWorkspace}`
    );
  }
);

export const registerUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = registerSchema.parse({ ...req.body });
    //parse() is Zod’s validation and type inference method.
    // registerSchema.parse(...) - validates that the body matches your defined schema.

    await registerUserService(body);

    return res
      .status(HTTPSTATUS.CREATED)
      .json({ message: "User created successfully" });
  }
);

export const loginController = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    //middleware from Passport.js used to verify user credentials.
    //local authentication strategy (usually checks email + password).
    //(err, user, info) → callback arguments:
    //Express.User extended UserDocuments refer to @types/index.d.ts , refers to an interface (a TypeScript type definition) that represents the user object attached to the req
    // object in Express when you’re using Passport.js authentication.
    //passport.authenticate("local", callback)
    // is just creating or return a middleware function, but not yet executing it. thats why we invoke (req,res,next)
    passport.authenticate(
      "local",
      (
        err: Error | null,
        user: Express.User | false,
        info: { message: string } | undefined
      ) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          return res
            .status(HTTPSTATUS.UNAUTHORIZED)
            .json({ message: info?.message || "Invalid email or password" });
        }

        return res
          .status(HTTPSTATUS.OK)
          .json({ message: "Logged in successfully", user });
      }
    )(req, res, next); // immediately invoke
  }
);

export const logOutController = asyncHandler(
  async (req: Request, res: Response) => {
    req.logout((err) => {
      // a Passport.js function that logs the user out of their session.
      if (err) {
        // The callback (err) => { ... } handles any possible errors from Passport’s logout process.
        console.error("Logout error:", err);
        return res
          .status(HTTPSTATUS.INTERNAL_SERVER_ERROR)
          .json({ error: "Failed to log out" });
      }
    });

    req.session = null; // It removes req.user and ends the login session stored in the session store (like Redis, MemoryStore, etc.).
    return res
      .status(HTTPSTATUS.OK)
      .json({ message: "Logged out successfully" });
  }
);
