// controllers/dashboard.controller.ts
import { Request, Response } from "express";

import { ApplicantModel, STAGES } from "../models/applicant.model";
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
   
RestaurantModel.countDocuments({
  $or: [
    { x_qr_token: { $exists: true, $ne: null } },
    { x_qr_generated_at: { $exists: true, $ne: null } },
    { qr_token: { $exists: true, $ne: null } },
    { qr_generated_at: { $exists: true, $ne: null } },
  ],
}),
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

export const getRestaurantsNeedingQr = async (_req: Request, res: Response) => {
  try {
    const restaurants = await RestaurantModel.find(
      {
        $and: [
          { $or: [{ x_qr_token: { $exists: false } }, { x_qr_token: null }] },
          { $or: [{ x_qr_generated_at: { $exists: false } }, { x_qr_generated_at: null } ] },
          { $or: [{ qr_token: { $exists: false } }, { qr_token: null }] },
          { $or: [{ qr_generated_at: { $exists: false } }, { qr_generated_at: null } ] },
        ],
      },
      "x_name x_location createdAt"
    )
      .sort({ createdAt: -1 })
      .lean();

    const data = restaurants.map((r: any) => ({
      id: r._id.toString(),
      name: r.x_name,
      location: r.x_location,
      createdAt: r.createdAt,
    }));

    res.status(200).json(successResponse("Restaurants needing QR setup fetched", { count: data.length, restaurants: data }));
  } catch (err: any) {
    res.status(500).json(errorResponse("Failed to fetch restaurants needing setup", err.message));
  }
};

export const getConversionRate = async (req: Request, res: Response) => {
  try {
    const days = Number(req.query.days) || 30;
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - days);

    const [allRestaurants, scansByRestaurant, feedbackByRestaurant] = await Promise.all([
      RestaurantModel.find({}, "x_name").lean(),
      ScanLog.aggregate([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: "$restaurantId", scans: { $sum: 1 } } },
      ]),
      FeedbackModel.aggregate([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: "$restaurant_id", feedback: { $sum: 1 } } },
      ]),
    ]);

    const scansById = new Map(scansByRestaurant.map((r: any) => [String(r._id), r.scans]));
    const feedbackById = new Map(feedbackByRestaurant.map((r: any) => [String(r._id), r.feedback]));

    const perRestaurant = allRestaurants
      .map((r: any) => {
        const id = String(r._id);
        const scans = scansById.get(id) ?? 0;
        const feedback = feedbackById.get(id) ?? 0;
        return {
          restaurantId: id,
          restaurantName: r.x_name ?? "Unknown restaurant",
          scans,
          feedback,
          conversionRate: scans > 0 ? Number(((feedback / scans) * 100).toFixed(1)) : 0,
        };
      })
      .sort((a, b) => b.conversionRate - a.conversionRate);

    const totalScans = perRestaurant.reduce((sum, r) => sum + r.scans, 0);
    const totalFeedback = perRestaurant.reduce((sum, r) => sum + r.feedback, 0);

    res.status(200).json(
      successResponse("Conversion rate fetched", {
        days,
        overall: {
          scans: totalScans,
          feedback: totalFeedback,
          conversionRate: totalScans > 0 ? Number(((totalFeedback / totalScans) * 100).toFixed(1)) : 0,
        },
        perRestaurant,
      })
    );
  } catch (err: any) {
    res.status(500).json(errorResponse("Failed to fetch conversion rate", err.message));
  }
};

export const getApplicantFunnel = async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? Number(req.query.days) : undefined;
    const match: Record<string, unknown> = {};
    if (days && days > 0) {
      const start = new Date();
      start.setUTCDate(start.getUTCDate() - days);
      match.createdAt = { $gte: start };
    }

    const rows = await ApplicantModel.aggregate([
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]);

    const countByStage = new Map(rows.map((r: any) => [r._id, r.count]));
    const total = rows.reduce((sum: number, r: any) => sum + r.count, 0);

 
    const funnel = STAGES.map((stage: string) => {
      const count = countByStage.get(stage) ?? 0;
      return {
        stage,
        count,
        percentOfTotal: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
      };
    });

    res.status(200).json(successResponse("Applicant funnel fetched", { total, funnel }));
  } catch (err: any) {
    res.status(500).json(errorResponse("Failed to fetch applicant funnel", err.message));
  }
};