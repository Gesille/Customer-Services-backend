import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type AttemptStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "expired"
  | "abandoned";

export type CompletionState = "not_started" | "content_in_progress" | "quiz_in_progress" | "completed";

export interface IAnswerRecord {
  questionId: Types.ObjectId;
  selectedOptionIndex?: number;
  selectedOptionValue?: string;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpentSeconds: number;
  answeredAt: Date;
}

export interface IAttempt extends Document {
  userId: Types.ObjectId;
  courseId: Types.ObjectId;
  assignedBy?: Types.ObjectId;
  assignedAt: Date;
  dueAt?: Date;
  status: AttemptStatus;
  completionState: CompletionState;

  openedAt?: Date;
  videoStartedAt?: Date;
  videoCompletedAt?: Date;
  videoProgressSeconds: number;
  contentViewedAt?: Date;
  contentCompletedAt?: Date;

  quizStartedAt?: Date;
  quizExpiresAt?: Date;
  timeLimitSeconds: number;
  timeTakenSeconds?: number;
  submittedAt?: Date;
  completedAt?: Date;
  expiredAt?: Date;
  isLate: boolean;

  answers: IAnswerRecord[];
  score: number;
  totalPossibleScore: number;
  totalQuestions: number;
  answeredQuestionsCount: number;
  correctAnswersCount: number;
  percentage: number;
  passed: boolean;
  passingScoreSnapshot: number;

  hasRated: boolean;
  notificationSent: boolean;
  remindersSent: number;
  lastReminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
//
const answerRecordSchema = new Schema<IAnswerRecord>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "CourseQuestion", required: true },
    selectedOptionIndex: { type: Number, min: 0 },
    selectedOptionValue: { type: String, trim: true },
    isCorrect: { type: Boolean, required: true, default: false },
    pointsEarned: { type: Number, required: true, default: 0, min: 0 },
    timeSpentSeconds: { type: Number, required: true, default: 0, min: 0 },
    answeredAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const attemptSchema = new Schema<IAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date, default: Date.now, required: true },
    dueAt: Date,
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "expired", "abandoned"],
      default: "not_started",
      index: true,
    },
    completionState: {
      type: String,
      enum: ["not_started", "content_in_progress", "quiz_in_progress", "completed"],
      default: "not_started",
      index: true,
    },

    openedAt: Date,
    videoStartedAt: Date,
    videoCompletedAt: Date,
    videoProgressSeconds: { type: Number, default: 0, min: 0 },
    contentViewedAt: Date,
    contentCompletedAt: Date,

    quizStartedAt: Date,
    quizExpiresAt: Date,
    timeLimitSeconds: { type: Number, required: true, min: 1 },
    timeTakenSeconds: { type: Number, min: 0 },
    submittedAt: Date,
    completedAt: Date,
    expiredAt: Date,
    isLate: { type: Boolean, default: false, index: true },

    answers: { type: [answerRecordSchema], default: [] },
    score: { type: Number, default: 0, min: 0 },
    totalPossibleScore: { type: Number, default: 0, min: 0 },
    totalQuestions: { type: Number, default: 0, min: 0 },
    answeredQuestionsCount: { type: Number, default: 0, min: 0 },
    correctAnswersCount: { type: Number, default: 0, min: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    passed: { type: Boolean, default: false, index: true },
    passingScoreSnapshot: { type: Number, required: true, min: 0 },

    hasRated: { type: Boolean, default: false },
    notificationSent: { type: Boolean, default: false },
    remindersSent: { type: Number, default: 0, min: 0 },
    lastReminderSentAt: Date,
  },
  { timestamps: true },
);

// A learner has one official assignment/attempt per published course.
attemptSchema.index({ userId: 1, courseId: 1 }, { unique: true });
attemptSchema.index({ courseId: 1, status: 1, updatedAt: -1 });
attemptSchema.index({ courseId: 1, isLate: 1, completedAt: -1 });
attemptSchema.index({ courseId: 1, passed: 1 });
attemptSchema.index({ quizExpiresAt: 1, status: 1 });
attemptSchema.index({ dueAt: 1, status: 1 });

const AttemptModel: Model<IAttempt> =
  mongoose.models.Attempt || mongoose.model<IAttempt>("Attempt", attemptSchema);

export default AttemptModel;
