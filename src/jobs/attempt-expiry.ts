import cron from "node-cron";
import AttemptModel from "../models/Attempt.model";

let started = false;

export const startAttemptExpiryWorker = () => {
  if (started) return;
  started = true;

  cron.schedule("* * * * *", async () => {
    const now = new Date();

    const expired = await AttemptModel.updateMany(
      {
        status: "in_progress",
        quizExpiresAt: { $lte: now },
      },
      {
        $set: {
          status: "expired",
          completionState: "quiz_in_progress",
          expiredAt: now,
        },
      },
    );

    const late = await AttemptModel.updateMany(
      {
        status: { $in: ["not_started", "in_progress"] },
        dueAt: { $lte: now },
        isLate: false,
      },
      { $set: { isLate: true } },
    );

    if (expired.modifiedCount || late.modifiedCount) {
      console.log(`Next Learn worker: expired ${expired.modifiedCount}, marked late ${late.modifiedCount}`);
    }
  });
};
