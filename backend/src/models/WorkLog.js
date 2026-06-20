import mongoose from 'mongoose';

const { Schema } = mongoose;

export const WORKLOG_STATUS = ['in_progress', 'done', 'blocked'];

const workLogSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Normalized day key "YYYY-MM-DD" (UTC) the work is logged against.
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, default: '', maxlength: 4000 },
    project: { type: String, required: true, trim: true, index: true },
    hoursSpent: { type: Number, required: true, min: 0, max: 24 },
    status: { type: String, enum: WORKLOG_STATUS, default: 'in_progress', index: true },
  },
  { timestamps: true }
);

// Common dashboard/report query: a user's logs over a date range, newest first.
workLogSchema.index({ user: 1, day: -1 });
// Filter by project/status within a date window.
workLogSchema.index({ day: 1, project: 1, status: 1 });

export default mongoose.model('WorkLog', workLogSchema);
