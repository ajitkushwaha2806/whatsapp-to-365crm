import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true, trim: true },
    role: { type: String, enum: ["admin", "staff"], default: "admin" },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id ? obj._id.toString() : obj.id;
  delete obj.password;
  delete obj.__v;
  return obj;
};

if (mongoose.models && mongoose.models.User) {
  delete mongoose.models.User;
}

export default mongoose.model("User", UserSchema);

