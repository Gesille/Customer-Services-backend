import { Request, Response } from "express";
import Question from "../models/Question.model"


export const submitQuestion = async (req: Request, res: Response) => {
  try {
    const question = String(req.body.question || "").trim();
    const askerEmail = req.body.email ? String(req.body.email).trim() : undefined;

    if (!question) {
      return res.status(400).json({ success: false, message: "Question is required." });
    }

    const created = await Question.create({
      question,
      origin: "client",
      isPublished: false,
      ...(askerEmail ? { askerEmail } : {}),
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("submitQuestion error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
  }
};

// ─── GET /api/questions/published ──────────────────────────────────────────
// Public — only the ones HR has answered and approved for display
export const getPublishedQuestions = async (_req: Request, res: Response) => {
  try {
    const questions = await Question.find({ isPublished: true, answer: { $exists: true, $ne: "" } })
      .sort({ createdAt: -1 })
      .select("question answer createdAt");

    return res.status(200).json({ success: true, data: questions });
  } catch (error) {
    console.error("getPublishedQuestions error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch questions." });
  }
};

// ─── GET /api/questions ─────────────────────────────────────────────────────
// HR dashboard — all questions, filterable by origin / published state
// ?origin=client|hr  ?published=true|false  ?page=1&limit=20
export const getAllQuestions = async (req: Request, res: Response) => {
  try {
    const { origin, published } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const filter: Record<string, unknown> = {};
    if (origin === "client" || origin === "hr") filter.origin = origin;
    if (published === "true") filter.isPublished = true;
    if (published === "false") filter.isPublished = false;

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Question.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: questions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("getAllQuestions error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch questions." });
  }
};

// ─── POST /api/questions/general ───────────────────────────────────────────
// HR dashboard — HR writes both the question and answer directly
export const addGeneralQuestion = async (req: Request, res: Response) => {
  try {
    const question = String(req.body.question || "").trim();
    const answer = String(req.body.answer || "").trim();
    const isPublished = req.body.isPublished !== false; // default true unless explicitly false

    if (!question || !answer) {
      return res.status(400).json({ success: false, message: "Question and answer are required." });
    }

    const created = await Question.create({
      question,
      answer,
      origin: "hr",
      isPublished,
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("addGeneralQuestion error:", error);
    return res.status(500).json({ success: false, message: "Failed to add question." });
  }
};

// ─── PATCH /api/questions/:id/answer ───────────────────────────────────────
// HR dashboard — answer a client-submitted question (does not publish automatically)
export const answerQuestion = async (req: Request, res: Response) => {
  try {
    const answer = String(req.body.answer || "").trim();
    if (!answer) {
      return res.status(400).json({ success: false, message: "Answer is required." });
    }

    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      { answer },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("answerQuestion error:", error);
    return res.status(500).json({ success: false, message: "Failed to save answer." });
  }
};

// ─── PATCH /api/questions/:id/publish ──────────────────────────────────────
// HR dashboard — add to / remove from the public Q&A collection
export const togglePublish = async (req: Request, res: Response) => {
  try {
    const { isPublished } = req.body;
    if (typeof isPublished !== "boolean") {
      return res.status(400).json({ success: false, message: "isPublished must be a boolean." });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }

    if (isPublished && !question.answer) {
      return res.status(400).json({
        success: false,
        message: "Answer this question before publishing it.",
      });
    }

    question.isPublished = isPublished;
    await question.save();

    return res.status(200).json({ success: true, data: question });
  } catch (error) {
    console.error("togglePublish error:", error);
    return res.status(500).json({ success: false, message: "Failed to update question." });
  }
};

// ─── DELETE /api/questions/:id ──────────────────────────────────────────────
export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }
    return res.status(200).json({ success: true, data: deleted });
  } catch (error) {
    console.error("deleteQuestion error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete question." });
  }
};