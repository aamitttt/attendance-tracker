import mongoose from 'mongoose';

const { Schema } = mongoose;

const teamSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // The manager of this team. A user; enforced to have role 'manager' at the service layer.
    manager: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// Members are modelled on the User side via user.team (a user belongs to exactly one team).
// This avoids a two-sided list that can drift out of sync.

export default mongoose.model('Team', teamSchema);
