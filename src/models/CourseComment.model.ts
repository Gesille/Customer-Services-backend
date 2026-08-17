import mongoose, { Document, Model, Schema, Types } from "mongoose";

// One comment thread = one employee's question/note on one course.
// Employee posts the initial comment; admin/HR replies (single reply per
// comment, matching how Question.model.ts works for the public FAQ).
// If you later want back-and-forth threads, replace `reply` with a
// `replies: IReply[]` array — kept single for now to match your "admin
// replies" ask.

export interface IReply {
  text: string;
  repliedBy: Types.ObjectId; // admin/HR user
  repliedAt: Date;
}

export interface ICourseComment extends Document {
  courseId: Types.ObjectId;
  userId: Types.ObjectId; // employee who wrote it
  text: string;
  reply?: IReply;
  status: "open" | "answered";
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new Schema<IReply>(
  {
    text: { type: String, required: true, trim: true },
    repliedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    repliedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const courseCommentSchema = new Schema<ICourseComment>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    reply: { type: replySchema },
    status: { type: String, enum: ["open", "answered"], default: "open", index: true },
  },
  { timestamps: true },
);

courseCommentSchema.index({ courseId: 1, createdAt: -1 });
courseCommentSchema.index({ userId: 1, createdAt: -1 });

const CourseCommentModel: Model<ICourseComment> =
  mongoose.models.CourseComment ||
  mongoose.model<ICourseComment>("CourseComment", courseCommentSchema);

export default CourseCommentModel;