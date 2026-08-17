import mongoose, { CallbackWithoutResultAndOptionalError, Document, Model, Schema } from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ROLES = {
  USER: "user",
  ADMIN: "admin",
  EMPLOYEE: "employee",
} as const;

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: {
    public_id: string;
    url: string;
  };
  department?: string;
  employeeId?: string;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  phone?: string;

  notifyByEmail: boolean;
  lastLoginAt?: Date;
  comparePassword: (password: string) => Promise<boolean>;
  SignAccessToken: () => string;
  SignRefreshToken: () => string;
  hasRole: (roles: string[]) => boolean;
  createdAt: Date;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      validate: {
        validator: function (value: string) {
          return emailRegexPattern.test(value);
        },
        message: "Please enter valid email",
      },
      unique: true,
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 character"],
      select: false,
    },
    avatar: {
      public_id: String,
      url: String,
    },
    department: {
      type: String,
    },
    employeeId: {
      type: String,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notifyByEmail: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    phone: {
      type: String,
    },
  },
  { timestamps: true },
);

userSchema.index({ department: 1 });
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre("save", async function (this: IUser) {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// sign access token
userSchema.methods.SignAccessToken = function () {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  if (!accessTokenSecret) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined");
  }
  return jwt.sign({ id: this._id }, accessTokenSecret, { expiresIn: "1h" });
};

// sign refresh token
userSchema.methods.SignRefreshToken = function () {
  const refreshTokenSecret = process.env.REFRESH_TOKEN;
  if (!refreshTokenSecret) {
    throw new Error("REFRESH_TOKEN is not defined");
  }
  return jwt.sign({ id: this._id }, refreshTokenSecret, { expiresIn: "3d" });
};

// compare password
userSchema.methods.comparePassword = async function (
  enteredPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.hasRole = function (roles: string[]): boolean {
  return roles.includes(this.role);
};

const userModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default userModel;