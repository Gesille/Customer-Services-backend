import mongoose from "mongoose";

const scanLogSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
  },
  { timestamps: true }
);

scanLogSchema.index({ createdAt: -1 });

export default mongoose.model("ScanLog", scanLogSchema);