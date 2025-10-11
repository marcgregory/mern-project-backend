import { NextFunction, Request, Response } from "express";
import { UnauthorizedException } from "../utils/appError";

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  req.user = { _id: "68e635197b0c65b78e38b5e2" } as any; // remove after test
  if (!req.user || !req.user._id) {
    throw new UnauthorizedException("Unauthorized. Please log in");
  }
  next();
};

export default isAuthenticated;
