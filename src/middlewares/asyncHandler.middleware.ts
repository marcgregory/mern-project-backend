import { NextFunction, Request, Response } from "express";

type AsycnControllerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler =
  (controller: AsycnControllerType): AsycnControllerType =>
  async (req, res, next) => {
    try {
      await controller(req, res, next);
    } catch (error) {
      next(error);
    }
  };
