import mongoose from 'mongoose';

const { Schema } = mongoose;

export const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid'];
export const LEAVE_STATUS = ['pending', 'approved', 'rejected', 'cancelled'];

const leaveRequestSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: LEAVE_TYPES, required: true },
    // Inclusive date range, stored as normalized "YYYY-MM-DD" keys for clean comparisons.
    startDay: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDay: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    // Inclusive working-day count (computed at creation; what is debited from the balance).
    days: { type: Number, required: true, min: 1 },
    reason: { type: String, trim: true, default: '', maxlength: 1000 },
    status: { type: String, enum: LEAVE_STATUS, default: 'pending', index: true },
    approver: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    decidedAt: { type: Date, default: null },
    decisionNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// Fast lookups for a user's leaves and for a manager's pending queue.
leaveRequestSchema.index({ user: 1, status: 1 });
leaveRequestSchema.index({ user: 1, startDay: 1, endDay: 1 });

export default mongoose.model('LeaveRequest', leaveRequestSchema);
