// controllers/dashboard.controller.ts
import { Request, Response } from "express";

import { ApplicantModel } from "../models/applicant.model";
import ContactSubmission from "../models/ContactSubmission";
import Question from "../models/Question.model";
import ScanLog from "../models/ScanLog.model";
import { errorResponse, successResponse } from "../models/response.model";
import { FeedbackModel } from "../models/feedback.model";
import { JobModel } from "../models/job.model";
import { RestaurantModel } from "../models/restaurant.model";
import mongoose from "mongoose";

// ─── helpers ─────────────────────────────────────────────────────────────

function dayRange(offsetDays = 0) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offsetDays));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function monthRange(offsetMonths = 0) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offsetMonths, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offsetMonths + 1, 1));
  return { start, end };
}

function computeDelta(current: number, previous: number): { delta: string; trend: "up" | "down" } {
  if (previous === 0) {
    return { delta: current > 0 ? "+100%" : "0%", trend: "up" };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    delta: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
    trend: pct >= 0 ? "up" : "down",
  };
}

async function last7DaysCounts(model: any, dateField = "createdAt"): Promise<number[]> {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 6);
  start.setUTCHours(0, 0, 0, 0);

  const rows = await model.aggregate([
    { $match: { [dateField]: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${dateField}` } }, count: { $sum: 1 } } },
  ]);

  const byDay = new Map<string, number>(
    rows.map((r: any) => [r._id as string, r.count as number])
  );

  const out: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(byDay.get(d.toISOString().slice(0, 10)) ?? 0);
  }
  return out;
}

// ─── GET /api/dashboard/stats ───────────────────────────────────────────
// Powers: QrHeroCard, all four StatCards
export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const thisMonth = monthRange(0);
    const lastMonth = monthRange(1);
    const today = dayRange(0);
    const yesterday = dayRange(1);

    const [
      restaurantsTotal,
      restaurantsThisMonth,
      feedbackThisMonth,
      feedbackLastMonth,
      avgRatingAgg,
      openJobs,
      applicantsTotal,
      applicantsToday,
      newContacts,
      pendingQuestions,
      scansToday,
      scansYesterday,
      activeQRs,
      feedbackSpark,
      applicantSpark,
    ] = await Promise.all([
      RestaurantModel.countDocuments(),
      RestaurantModel.countDocuments({ createdAt: { $gte: thisMonth.start, $lt: thisMonth.end } }),
      FeedbackModel.countDocuments({ createdAt: { $gte: thisMonth.start, $lt: thisMonth.end } }),
      FeedbackModel.countDocuments({ createdAt: { $gte: lastMonth.start, $lt: lastMonth.end } }),
      FeedbackModel.aggregate([{ $group: { _id: null, avg: { $avg: "$overall_rating" } } }]),
      JobModel.countDocuments({ status: "open" }),
      ApplicantModel.countDocuments(),
      ApplicantModel.countDocuments({ createdAt: { $gte: today.start, $lt: today.end } }),
      ContactSubmission.countDocuments({ status: "new" }),
      Question.countDocuments({ $or: [{ answer: { $exists: false } }, { answer: "" }] }),
      ScanLog.countDocuments({ createdAt: { $gte: today.start, $lt: today.end } }),
      ScanLog.countDocuments({ createdAt: { $gte: yesterday.start, $lt: yesterday.end } }),
      // NOTE: adjust field name below to whatever markQrGenerated actually sets on Restaurant
      RestaurantModel.countDocuments({ qr_generated_at: { $exists: true, $ne: null } }),
      last7DaysCounts(FeedbackModel),
      last7DaysCounts(ApplicantModel),
    ]);

    const feedbackDelta = computeDelta(feedbackThisMonth, feedbackLastMonth);
    const scansDelta = computeDelta(scansToday, scansYesterday);

    res.status(200).json(
      successResponse("Dashboard stats fetched", {
        restaurants: { value: restaurantsTotal, newThisMonth: restaurantsThisMonth },
        feedback: { value: feedbackThisMonth, ...feedbackDelta, data: feedbackSpark },
        avgRating: { value: Number((avgRatingAgg[0]?.avg ?? 0).toFixed(2)) },
        openJobs: { value: openJobs },
        applicants: { value: applicantsTotal, newToday: applicantsToday, data: applicantSpark },
        newContacts: { value: newContacts },
        pendingQuestions: { value: pendingQuestions },
        scansToday: { value: scansToday, ...scansDelta },
        activeQRs: { value: activeQRs },
      })
    );
  } catch (err: any) {
    res.status(500).json(errorResponse("Failed to fetch dashboard stats", err.message));
  }
};

// ─── GET /api/dashboard/scan-trend ──────────────────────────────────────
// Powers: ScansChart (last 14 days, daily counts)
export const getScanTrend = async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 13);
    start.setUTCHours(0, 0, 0, 0);

    const rows = await ScanLog.aggregate([
      { $match: { createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, scans: { $sum: 1 } } },
    ]);

    const byDay = new Map(rows.map((r: any) => [r._id, r.scans]));
    const data: { date: string; scans: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      data.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), scans: byDay.get(key) ?? 0 });
    }

    res.status(200).json(successResponse("Scan trend fetched", data));
  } catch (err: any) {
    res.status(500).json(errorResponse("Failed to fetch scan trend", err.message));
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(50, Number(req.query.limit) || 15);

    const [scans, feedback, applicants] = await Promise.all([
      ScanLog.find().sort({ createdAt: -1 }).limit(limit).populate("restaurantId", "x_name").lean(),
      FeedbackModel.find().sort({ createdAt: -1 }).limit(limit).lean(),
      ApplicantModel.find().sort({ createdAt: -1 }).limit(limit).lean(),
    ]);

    // filter out missing/invalid restaurant_id values before querying
    const restaurantIds = [
      ...new Set(
        feedback
          .map((f: any) => f.restaurant_id)
          .filter((id: any) => id && mongoose.Types.ObjectId.isValid(id))
          .map((id: any) => String(id))
      ),
    ];

    const restaurants = restaurantIds.length
      ? await RestaurantModel.find({ _id: { $in: restaurantIds } }, "x_name").lean()
      : [];

    const nameById = new Map(restaurants.map((r: any) => [String(r._id), r.x_name]));

    const events = [
      ...scans.map((s: any) => ({
        id: s._id.toString(),
        type: "scan" as const,
        restaurantName: s.restaurantId?.x_name ?? "Unknown restaurant",
        detail: "scanned the QR code",
        time: s.createdAt,
      })),
      ...feedback.map((f: any) => ({
        id: f._id.toString(),
        type: "feedback" as const,
        restaurantName: f.restaurant_id ? nameById.get(String(f.restaurant_id)) ?? "Unknown restaurant" : "Unknown restaurant",
        detail: `received ${f.overall_rating}★ feedback from ${f.customer_name}`,
        time: f.createdAt,
      })),
      ...applicants.map((a: any) => ({
        id: a._id.toString(),
        type: "applicant" as const,
        restaurantName: a.name,
        detail: "submitted a CV",
        time: a.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);

    res.status(200).json(successResponse("Recent activity fetched", events));
  } catch (err: any) {
    res.status(500).json(errorResponse("Failed to fetch recent activity", err.message));
  }
};