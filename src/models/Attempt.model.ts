import mongoose, { Document, Model, Schema, Types } from "mongoose";

/**
 * NOTE: This model replaces the old separate `CourseAssignment` model.
 * One Attempt = one user's relationship to one course, from the moment
 * it's assigned to them until they finish (or it expires). This is the
 * single source of truth for the tracker and analytics — don't split
 * "assignment" and "attempt" into two collections again, they will
 * drift out of sync.
 *
 * Typical lifecycle:
 *   1. Course published -> one Attempt created per active user,
 *      status = "not_started", dueAt = now + course.dueInDays
 *   2. User opens the course -> status = "in_progress", openedAt set
 *   3. User starts quiz -> quizStartedAt set, quizExpiresAt = now + timeLimitSeconds
 *   4. User submits -> status = "completed", completedAt set,
 *      isLate computed from completedAt vs dueAt
 *   5. Cron worker checks quizExpiresAt <= now && status === "in_progress"
 *      -> status = "expired"
 */

export type AttemptStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "expired";

export interface IAnswerRecord {
  questionId: Types.ObjectId;
  selectedOptionIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpentSeconds: number;
  answeredAt?: Date;
}

export interface IAttempt extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;

  /*
   * ─────────────────────────────────────
   * ASSIGNMENT (formerly CourseAssignment)
   * ─────────────────────────────────────
   */
  assignedAt: Date;
  dueAt?: Date; // snapshot: course.dueInDays applied at assignment time
  notificationSent: boolean; // "new course" notification/email sent?

  /*
   * ─────────────────────────────────────
   * COURSE / LEARNING PROGRESS
   * ─────────────────────────────────────
   */
  status: AttemptStatus;

  openedAt?: Date;

  videoStartedAt?: Date;
  videoCompletedAt?: Date;
  videoProgressSeconds: number;

  contentViewedAt?: Date;
  contentCompletedAt?: Date;

  /*
   * ─────────────────────────────────────
   * QUIZ + TIMER
   * ─────────────────────────────────────
   */
  quizStartedAt?: Date;
  completedAt?: Date;

  timeLimitSeconds: number; // snapshot of course.timeLimitSeconds at quiz start
  quizExpiresAt?: Date; // quizStartedAt + timeLimitSeconds, used by the expiry worker
  timeTakenSeconds?: number;

  /*
   * ─────────────────────────────────────
   * LATE TRACKING
   * ─────────────────────────────────────
   */
  isLate: boolean; // computed: completedAt > dueAt (or expired without completing)

  /*
   * ─────────────────────────────────────
   * ANSWERS
   * ─────────────────────────────────────
   */
  answers: IAnswerRecord[];

  /*
   * ─────────────────────────────────────
   * RESULT
   * ─────────────────────────────────────
   */
  score: number;
  totalPossibleScore: number;
  totalQuestions: number;
  correctAnswersCount: number;
  percentage: number;
  passed: boolean;

  /*
   * ─────────────────────────────────────
   * REMINDERS
   * ─────────────────────────────────────
   */
  remindersSent: number;
}

const answerRecordSchema = new Schema<IAnswerRecord>(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    selectedOptionIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    pointsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    answeredAt: {
      type: Date,
    },
  },
  {
    _id: false,
  },
);

const attemptSchema = new Schema<IAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    /*
     * ASSIGNMENT
     */
    assignedAt: {
      type: Date,
      default: Date.now,
    },

    dueAt: {
      type: Date,
    },

    notificationSent: {
      type: Boolean,
      default: false,
    },

    /*
     * COURSE PROGRESS
     */
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "expired"],
      default: "not_started",
    },

    openedAt: {
      type: Date,
    },

    videoStartedAt: {
      type: Date,
    },

    videoCompletedAt: {
      type: Date,
    },

    videoProgressSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },

    contentViewedAt: {
      type: Date,
    },

    contentCompletedAt: {
      type: Date,
    },

    /*
     * QUIZ
     */
    quizStartedAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    timeLimitSeconds: {
      type: Number,
      required: true,
      min: 30,
    },

    quizExpiresAt: {
      type: Date,
    },

    timeTakenSeconds: {
      type: Number,
      min: 0,
    },

    /*
     * LATE
     */
    isLate: {
      type: Boolean,
      default: false,
    },

    /*
     * ANSWERS
     */
    answers: {
      type: [answerRecordSchema],
      default: [],
    },

    /*
     * RESULT
     */
    score: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPossibleScore: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalQuestions: {
      type: Number,
      default: 0,
      min: 0,
    },

    correctAnswersCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    passed: {
      type: Boolean,
      default: false,
    },

    /*
     * REMINDERS
     */
    remindersSent: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// One attempt per user per course
attemptSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Analytics
attemptSchema.index({ courseId: 1, status: 1 });
attemptSchema.index({ courseId: 1, isLate: 1 });
attemptSchema.index({ userId: 1, status: 1 });
attemptSchema.index({ courseId: 1, passed: 1 });
attemptSchema.index({ completedAt: -1 });

// Timer worker (auto-expire in-progress quizzes)
attemptSchema.index({ quizExpiresAt: 1, status: 1 });

// Reminder worker (find not_started/in_progress attempts approaching dueAt)
attemptSchema.index({ dueAt: 1, status: 1 });

const AttemptModel: Model<IAttempt> =
  mongoose.models.Attempt || mongoose.model<IAttempt>("Attempt", attemptSchema);

export default AttemptModel;