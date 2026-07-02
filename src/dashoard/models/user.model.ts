import mongoose, { Document, Model, Schema } from "mongoose";
require("dotenv").config();
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ROLES = {
 USER: "user",
  ADMIN: "admin",
  
};

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar: {
    public_id: string;
    url: string;
  };
  role: string;
  isVerified: boolean;
  courses: Array<{ courseId: string }>;
  books: Array<{
    _id: number;bookId:string
}>
  comparePassword: (password: string) => Promise<boolean>;
  SignAccessToken: () => string;
  SignRefreshToken: () => string;
  hasRole: (roles: string[]) => boolean;
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
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    courses: [
      {
        courseId: String,
      },
    ],
    books:[
      {bookId :String}
    ]
  },
  { timestamps: true }
);

//Mash Password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 10);
});


//sign access token
userSchema.methods.SignAccessToken = function () {

 const accessTokenSecret = process.env.ACCESS_TOKEN;
  if (!accessTokenSecret) {
    throw new Error('ACCESS_TOKEN is not defined');
  }
  return jwt.sign({ id: this._id }, accessTokenSecret, { expiresIn: "5m" });

};

//signrefresh token
userSchema.methods.SignRefreshToken = function () {
  const refreshTokenSecret = process.env.REFRESH_TOKEN;
  if (!refreshTokenSecret) {
    throw new Error('REFRESH_TOKEN is not defined');
  }
  return jwt.sign({ id: this._id }, refreshTokenSecret, { expiresIn: "3d" });
};

//compare password
userSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.hasRole = function (roles: string[]): boolean {
  return roles.includes(this.role);
};

const userModel: Model<IUser> = mongoose.model("User", userSchema);
export default userModel;
