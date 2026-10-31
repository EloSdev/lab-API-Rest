import type { Request, Response } from "express";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config.js";
import { repositories } from "./data-layer/index.js";
import { checkContentTypeJSON } from './middleware.js';

const { useCORS, port } = config;

const { hotelRepo, cityRepo } = repositories;

const app = express();

// Middleware
app.use(morgan("dev"));
app.use(express.json());
app.use('/api', checkContentTypeJSON);

if (useCORS) {
  app.use(express.static("public"));
  app.use("/api", cors());
} else {
  app.use(express.static("front"));
}

// Routes
app.get("/api/hotels", (_: Request, res: Response) => {
  try {
    const data = hotelRepo.findAll();
    res.json({ data });
  } catch (err) {
    // TODO: Handle error type
    res.status(500).json({
      error: {
        code: 500,
        message: "Internal server error",
      },
    });
  }
});

app.post("/api/hotels", (req: Request, res: Response) => {
  const hotel = req.body;

  try {
    const data = hotelRepo.create(hotel);
    res.status(201).send({ data });
  } catch (err) {
    // TODO: Handle error type
    res.status(500).json({
      error: {
        code: 500,
        message: "Internal server error",
      },
    });
  }
});

app.get("/api/cities", (_: Request, res: Response) => {
  try {
    const data = cityRepo.findAll();
    res.json({ data });
  } catch (err) {
    // TODO: Handle error type
    res.status(500).json({
      error: {
        code: 500,
        message: "Internal server error",
      },
    });
  }
});

app.get("/api/hotels/:id", (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const data = hotelRepo.findById(id);
    res.json({ data });
  } catch (error) {
    // TODO: Handle error type
    res.status(500).json({
      error: {
        code: 500,
        message: "Internal server error",
      },
    });
  }
});

app.put("/api/hotels/:id", (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const hotel = req.body;
    const data = hotelRepo.update(id, hotel);
    res.json({ data });
  } catch (error) {
    // TODO: Handle error type
    res.status(500).json({
      error: {
        code: 500,
        message: "Internal server error",
      },
    });
  }
});

app.delete("/api/hotels/:id", (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    hotelRepo.delete(id);
    res.status(204).send();
  } catch (error) {
    // TODO: Handle error type
    res.status(500).json({
      error: {
        code: 500,
        message: "Internal server error",
      },
    });
  }
});

app.listen(port, () => {
  console.log(`Application running on ${port}`);
});