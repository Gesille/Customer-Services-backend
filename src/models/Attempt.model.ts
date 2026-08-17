import mongoose, { Document, Model, Schema, Types } from "mongoose";

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


  assignedAt: Date;
  dueAt?: Date; 
  notificationSent: boolean; 
  status: AttemptStatus;

  openedAt?: Date;

  videoStartedAt?: Date;
  videoCompletedAt?: Date;
  videoProgressSeconds: number;

  contentViewedAt?: Date;
  contentCompletedAt?: Date;

 
  quizStartedAt?: Date;
  completedAt?: Date;
hasRated: boolean;
  timeLimitSeconds: number; 
  quizExpiresAt?: Date; 
  timeTakenSeconds?: number;

  isLate: boolean; 

  
  answers: IAnswerRecord[];

 
  score: number;
  totalPossibleScore: number;
  totalQuestions: number;
  correctAnswersCount: number;
  percentage: number;
  passed: boolean;
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

     hasRated: { type: Boolean, default: false },
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

    isLate: {
      type: Boolean,
      default: false,
    },

    answers: {
      type: [answerRecordSchema],
      default: [],
    },

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