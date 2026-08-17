import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type CourseCommentStatus = "open" | "answered" | "resolved" | "hidden";

export interface ICommentMessage {
  _id?: Types.ObjectId;
  text: string;
  authorId: Types.ObjectId;
  authorRole: "employee" | "admin" | "manager" | "system";
  createdAt: Date;
  editedAt?: Date;
  isEdited: boolean;
}

export interface ICourseComment extends Document {
  courseId: Types.ObjectId;
  userId: Types.ObjectId;
  attemptId?: Types.ObjectId;
  parentCommentId?: Types.ObjectId;
  subject?: string;
  messages: Types.DocumentArray<ICommentMessage>;
  status: CourseCommentStatus;
  lastMessageAt: Date;
  lastMessageBy?: Types.ObjectId;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const commentMessageSchema = new Schema<ICommentMessage>(
  {
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: {
      type: String,
      enum: ["employee", "admin", "manager", "system"],
      required: true,
    },
    editedAt: Date,
    isEdited: { type: Boolean, default: false },
  },
  { _id: true, timestamps: { createdAt: true, updatedAt: false } },
);

const courseCommentSchema = new Schema<ICourseComment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attemptId: { type: Schema.Types.ObjectId, ref: "Attempt" },
    parentCommentId: { type: Schema.Types.ObjectId, ref: "CourseComment" },
    subject: { type: String, trim: true, maxlength: 200 },
    messages: {
      type: [commentMessageSchema],
      required: true,
      validate: {
        validator: (messages: ICommentMessage[]) => messages.length > 0,
        message: "A comment thread must contain at least one message",
      },
    },
    status: {
      type: String,
      enum: ["open", "answered", "resolved", "hidden"],
      default: "open",
      index: true,
    },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessageBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date,
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

courseCommentSchema.index({ courseId: 1, status: 1, lastMessageAt: -1 });
courseCommentSchema.index({ userId: 1, createdAt: -1 });
courseCommentSchema.index({ attemptId: 1 });

const CourseCommentModel: Model<ICourseComment> =
  mongoose.models.CourseComment ||
  mongoose.model<ICourseComment>("CourseComment", courseCommentSchema);

export default CourseCommentModel;

export { commentMessageSchema };
