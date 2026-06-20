import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

export const ROLES = ['employee', 'manager', 'admin'];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'employee', index: true },
    // The team this user belongs to. Admins/HR may have no team (they see everything).
    team: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    // Leave balance in days. Decremented on approval, restored if an approved leave is cancelled.
    leaveBalance: { type: Number, default: 20, min: 0 },
    // Per-role daily target hours (used by the "on track" indicator / under-logger reports).
    dailyTargetHours: { type: Number, default: 8, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Helper to set password (hashes with bcrypt).
userSchema.methods.setPassword = async function setPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Never leak the hash in JSON responses.
userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
