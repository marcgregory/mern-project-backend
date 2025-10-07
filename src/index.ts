import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import session from "cookie-session";
import { config } from "./config/app.config";
import connectDatabase from "./config/database.config";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { HTTPSTATUS } from "./config/http.config";
import { asyncHandler } from "./middlewares/asyncHandler.middleware";
import { BadRequestException } from "./utils/appError";

import "./config/passport.config";
import passport from "passport";
import authRoutes from "./routes/auth.route";

const app = express();

const BASE_PATH = config.BASE_PATH;

app.use(express.json()); //This middleware parses incoming JSON request bodies — turning raw JSON data into a usable JavaScript object on req.body.

app.use(express.urlencoded({ extended: true })); //This middleware parses URL-encoded form data — typically sent by HTML forms (application/x-www-form-urlencoded).

app.use(
  session({
    name: "session", //This sets the cookie name stored in the browser
    keys: [config.SESSION_SECRET], //The secret key(s) used to sign and encrypt the session cookie — protects it from tampering
    maxAge: 24 * 60 * 60 * 1000, // 1 day expiration
    secure: config.NODE_ENV === "production", //When true, cookies are sent only over HTTPS. This keeps your sessions secure in production but still allows HTTP in development.
    httpOnly: true, // Prevents client-side JavaScript from accessing the cookie (protects against XSS attacks). Only the server can read or modify it.
    sameSite: "lax", //Helps protect against CSRF attacks by limiting when cookies are sent on cross-site requests. “lax” means it’s allowed on top-level navigations (safe for most apps).
  })
);

app.use(passport.initialize()); //Initializes Passport for every request.
//It sets up Passport’s internal middleware so Express knows how to use it.
app.use(passport.session()); //Enables persistent login sessions using cookies.

app.use(
  cors({
    origin: config.FRONTEND_ORIGIN, //Defines which website (domain) is allowed to access your backend API
    credentials: true, //Allows the browser to include cookies, authorization headers, or session data with requests. Required if your app uses login sessions or authentication cookies.
  })
);

app.get(
  "/",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    throw new BadRequestException("This is a bad request");
    res
      .status(HTTPSTATUS.OK)
      .json({ message: "Hello Subscribe to the channel & share " });
  })
);

app.use(`${BASE_PATH}/auth`, authRoutes);

app.use(errorHandler);

app.listen(config.PORT, async () => {
  console.log(`Server listening on port ${config.PORT} in ${config.NODE_ENV}`);
  await connectDatabase();
});
