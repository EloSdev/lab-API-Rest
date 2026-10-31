import type { Request, Response, NextFunction } from "express";

export const checkContentTypeJSON = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const accept = req.get("Accept");

  if (accept !== "application/json") {
    return res.status(406).json({ error: "Not Acceptable" });
  }

  next();
};