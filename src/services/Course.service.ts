import { Response } from "express";
import mongoose from "mongoose";
import CourseModel, { ICourse } from "../models/Course.model";
import QuestionModel, { ICourseQuestion } from "../models/CourseQuestion.model";
import AttemptModel from "../models/Attempt.model";
import NotificationModel from "../models/Notification.model";
import EmailLogModel from "../models/Emaillog.model";
import userModel, { ROLES } from "../models/user.model";
import sendMail from "../utils/sendMail";

import { bufferToDataUri } from "../middleware/upload";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary";

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface ICreateCourseInput extends Partial<ICourse> {
  questions: Array<
    Pick<ICourseQuestion, "type" | "text" | "options" | "points" | "explanation">
  >;
}

export const createCourseService = async (
  data: ICreateCourseInput,
  createdBy: mongoose.Types.ObjectId,
  res: Response,
) => {
  const { questions, ...courseData } = data;

  if (!questions || questions.length === 0) {
    return res.status(400).json({
      success: false,
      message: "A course must have at least one question",
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // next order number = current course count + 1
    const lastCourse = await CourseModel.findOne()
      .sort({ order: -1 })
      .session(session);
    const nextOrder = lastCourse ? lastCourse.order + 1 : 1;

    const title = String(courseData.title || "next-learn-course");
    const generatedSlug = slugify(String(courseData.slug || title)) || `course-${nextOrder}`;
    const generatedCode = String(courseData.courseCode || `NEXT LEARN #${String(nextOrder).padStart(2, "0")}`);

    const [course] = await CourseModel.create(
      [
        {
          ...courseData,
          title,
          slug: generatedSlug,
          courseCode: generatedCode,
          order: nextOrder,
          status: "draft",
          createdBy,
        },
      ],
      { session },
    );

    const questionDocs = questions.map((q, index) => ({
      ...q,
      options: (q.options || []).map((option: any, optionIndex: number) => ({
        ...option,
        value: option.value || `option-${optionIndex + 1}`,
      })),
      courseId: course._id,
      order: index + 1,
    }));

    await QuestionModel.insertMany(questionDocs, { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Course created as draft",
      course,
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};


// NEW — replace a draft course's hero image. Deletes the old Cloudinary
// asset (if any) so drafts don't accumulate orphaned uploads while an
// admin is iterating on the image.
export const updateCourseHeroImageService = async (
  course: ICourse,
  file: Express.Multer.File,
  res: Response,
) => {
  const previousPublicId = course.heroImage?.public_id;

  const uploaded = await uploadToCloudinary(bufferToDataUri(file), "course-hero-images", "image");

  course.heroImage = {
    public_id: uploaded.public_id,
    url: uploaded.secure_url,
    altText: course.title,
  };
  await course.save();

  if (previousPublicId) {
    // best-effort cleanup — don't fail the request if this errors
    deleteFromCloudinary(previousPublicId, "image").catch(() => undefined);
  }

  res.status(200).json({ success: true, course });
};

export const publishCourseService = async (
  courseId: string,
  publishedBy: mongoose.Types.ObjectId,
  res: Response,
) => {
  const course = await CourseModel.findById(courseId);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found",
    });
  }

  if (course.status === "published") {
    return res.status(400).json({
      success: false,
      message: "Course is already published",
    });
  }

  const questionCount = await QuestionModel.countDocuments({
    courseId: course._id,
    isActive: true,
  });

  if (questionCount === 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot publish a course with no active questions",
    });
  }

    course.status = "published";
  course.publishedAt = new Date();
  course.updatedBy = publishedBy;

  await course.save();

  // Every active employee gets this course assigned
  const employees = await userModel.find({
    role: ROLES.EMPLOYEE,
    isActive: true,
  });

  const now = new Date();
  const dueAt = new Date(now.getTime() + course.dueInDays * 24 * 60 * 60 * 1000);

  // Don't duplicate attempts for employees who somehow already have one
  const existingAttempts = await AttemptModel.find({
    courseId: course._id,
  }).select("userId");
  const alreadyAssigned = new Set(existingAttempts.map((a) => a.userId.toString()));

  const newAttemptEmployees = employees.filter(
    (emp) => !alreadyAssigned.has((emp._id as mongoose.Types.ObjectId).toString()),
  );

  if (newAttemptEmployees.length > 0) {
    await AttemptModel.insertMany(
      newAttemptEmployees.map((emp) => ({
        userId: emp._id,
        courseId: course._id,
        assignedAt: now,
        dueAt,
        status: "not_started",
        completionState: "not_started",
        timeLimitSeconds: course.timeLimitSeconds,
        passingScoreSnapshot: course.passingScore,
      })),
    );

    // In-app notifications
    await NotificationModel.insertMany(
      newAttemptEmployees.map((emp) => ({
        userId: emp._id,
        title: "New training available",
        message: `${course.courseCode}: ${course.title} — due ${dueAt.toDateString()}`,
        type: "new_course",
        relatedCourse: course._id,
        link: `/courses/${course._id}`,
      })),
    );
  }

  // Email batch — logged so failures can be retried
    const recipients = newAttemptEmployees
    .filter((emp) => emp.notifyByEmail)
    .map((emp) => ({
      userId: emp._id,
      email: emp.email,
      status: "pending" as const,
    }));

  console.log("[COURSE_EMAIL][RECIPIENTS_SELECTED]", {
    courseId: course._id.toString(),
    courseCode: course.courseCode,
    assignedEmployees: newAttemptEmployees.length,
    emailRecipients: recipients.length,
    recipients: recipients.map((recipient) => ({
      userId: recipient.userId.toString(),
      email: `${recipient.email.slice(0, 2)}***@${recipient.email.split("@")[1] || "unknown"}`,
      notifyByEmail: true,
    })),
  });

    const emailLog = await EmailLogModel.create({
    courseId: course._id,
    subject: `New training: ${course.title}`,
    templateName: "new-course.ejs",
    recipients,
    totalRecipients: recipients.length,
    status: "sending",
    sentBy: publishedBy,
    startedAt: now,
  });

  console.log("[COURSE_EMAIL][LOG_CREATED]", {
    emailLogId: emailLog._id.toString(),
    courseId: course._id.toString(),
    totalRecipients: emailLog.totalRecipients,
    template: emailLog.templateName,
  });


  // Fire emails — don't block the response on this if you have a lot of
  // employees; for a moderate headcount this is fine to await inline.
  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of emailLog.recipients) {
    console.log("[COURSE_EMAIL][RECIPIENT_START]", {
      emailLogId: emailLog._id.toString(),
      userId: recipient.userId.toString(),
      email: `${recipient.email.slice(0, 2)}***@${recipient.email.split("@")[1] || "unknown"}`,
    });
    try {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const courseLink = `${frontendUrl.replace(/\/$/, "")}/courses/${course._id}`;

      console.log("[COURSE_EMAIL][TEMPLATE_DATA]", {
        emailLogId: emailLog._id.toString(),
        template: "new-course.ejs",
        hasTitle: Boolean(course.title),
        hasDueAt: Boolean(dueAt),
        courseLink,
      });

      await sendMail({
        email: recipient.email,
        subject: emailLog.subject,
        template: "new-course.ejs",
        data: {
          title: course.title,
          dueAt: dueAt.toDateString(),
          link: courseLink,
        },
      });

            recipient.status = "sent";
      recipient.sentAt = new Date();
      sentCount++;
      console.log("[COURSE_EMAIL][RECIPIENT_SUCCESS]", {
        emailLogId: emailLog._id.toString(),
        userId: recipient.userId.toString(),
        sentCount,
      });
    } catch (err: any) {
      recipient.status = "failed";
      recipient.error = err.message;
      failedCount++;
      console.error("[COURSE_EMAIL][RECIPIENT_FAILED]", {
        emailLogId: emailLog._id.toString(),
        userId: recipient.userId.toString(),
        email: `${recipient.email.slice(0, 2)}***@${recipient.email.split("@")[1] || "unknown"}`,
        errorName: err?.name,
        errorCode: err?.code,
        errorCommand: err?.command,
        errorResponseCode: err?.responseCode,
        errorMessage: err?.message,
        stack: err?.stack,
      });
    }

  }

  emailLog.totalSent = sentCount;
  emailLog.totalFailed = failedCount;
  emailLog.status = failedCount === 0 ? "completed" : "failed";
  emailLog.completedAt = new Date();
    await emailLog.save();

  console.log("[COURSE_EMAIL][BATCH_FINISHED]", {
    emailLogId: emailLog._id.toString(),
    courseId: course._id.toString(),
    totalRecipients: recipients.length,
    sentCount,
    failedCount,
    status: emailLog.status,
  });

  res.status(200).json({

    success: true,
    message: `Course published. Assigned to ${newAttemptEmployees.length} employee(s), emailed ${sentCount}, failed ${failedCount}.`,
    course,
  });
};

/**
 * Get all courses (admin dashboard) — most recent first.
 */
export const getAllCoursesService = async (res: Response) => {
  const courses = await CourseModel.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    courses,
  });
};


export const getMyCoursesService = async (
  userId: mongoose.Types.ObjectId,
  res: Response,
) => {
  const attempts = await AttemptModel.find({ userId }).populate({
    path: "courseId",
    match: { status: "published" },
  });

  const courses = attempts
    .filter((a) => a.courseId) // in case the course was archived/deleted
    .map((a) => ({
      course: a.courseId,
      attemptId: a._id,
      status: a.status,
      dueAt: a.dueAt,
      isLate: a.isLate,
      score: a.score,
      percentage: a.percentage,
      passed: a.passed,
    }));

  res.status(200).json({
    success: true,
    courses,
  });
};


export const getCourseAnalyticsService = async (
  courseId: string,
  res: Response,
) => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: "Course not found",
    });
  }

  const [summary] = await AttemptModel.aggregate([
    { $match: { courseId: course._id } },
    {
      $group: {
        _id: null,
        totalAssigned: { $sum: 1 },
        totalCompleted: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        totalInProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
        },
        totalNotStarted: {
          $sum: { $cond: [{ $eq: ["$status", "not_started"] }, 1, 0] },
        },
        totalExpired: {
          $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] },
        },
        totalLate: { $sum: { $cond: ["$isLate", 1, 0] } },
        totalPassed: { $sum: { $cond: ["$passed", 1, 0] } },
        avgPercentage: { $avg: "$percentage" },
        avgTimeTakenSeconds: { $avg: "$timeTakenSeconds" },
      },
    },
  ]);

  // Per-question breakdown: which questions people get wrong most
  const questionStats = await AttemptModel.aggregate([
    { $match: { courseId: course._id, status: "completed" } },
    { $unwind: "$answers" },
    {
      $group: {
        _id: "$answers.questionId",
        timesAnswered: { $sum: 1 },
        timesCorrect: { $sum: { $cond: ["$answers.isCorrect", 1, 0] } },
        avgTimeSpentSeconds: { $avg: "$answers.timeSpentSeconds" },
      },
    },
    {
      $lookup: {
        from: "questions",
        localField: "_id",
        foreignField: "_id",
        as: "question",
      },
    },
    { $unwind: "$question" },
    {
      $project: {
        _id: 0,
        questionId: "$_id",
        text: "$question.text",
        timesAnswered: 1,
        timesCorrect: 1,
        accuracyPercent: {
          $round: [
            { $multiply: [{ $divide: ["$timesCorrect", "$timesAnswered"] }, 100] },
            1,
          ],
        },
        avgTimeSpentSeconds: { $round: ["$avgTimeSpentSeconds", 1] },
      },
    },
    { $sort: { accuracyPercent: 1 } }, // hardest questions first
  ]);

  res.status(200).json({
    success: true,
    course: { id: course._id, title: course.title, courseCode: course.courseCode },
    summary: summary || {
      totalAssigned: 0,
      totalCompleted: 0,
      totalInProgress: 0,
      totalNotStarted: 0,
      totalExpired: 0,
      totalLate: 0,
      totalPassed: 0,
      avgPercentage: 0,
      avgTimeTakenSeconds: 0,
    },
    questionStats,
  });
};