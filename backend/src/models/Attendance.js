import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ATTENDANCE_STATUS = ['present', 'wfh', 'leave', 'absent'];

const attendanceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Normalized day key "YYYY-MM-DD" (UTC). Guarantees one record per user per calendar day.
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    status: { type: String, enum: ATTENDANCE_STATUS, default: 'present' },
    // Computed hours between check-in and check-out (or a capped value on missing check-out).
    hoursWorked: { type: Number, default: 0, min: 0 },
    late: { type: Boolean, default: false },
    // True when the day was auto-closed because the user never checked out.
    missingCheckout: { type: Boolean, default: false },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// One attendance row per user per day — prevents double check-in.
attendanceSchema.index({ user: 1, day: 1 }, { unique: true });
// Fast range queries for dashboards/reports.
attendanceSchema.index({ day: 1 });

export default mongoose.model('Attendance', attendanceSchema);
