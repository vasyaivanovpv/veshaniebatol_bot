const { Schema, model } = require("mongoose");

const schema = new Schema({
  uploadedAt: Date,
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  round: {
    type: Schema.Types.ObjectId,
    ref: "Round",
    required: true,
  },
  pair: Number,
  trackId: String,
  fileUniqueId: String,
  scores: [
    {
      referee: Number,
      score: {
        type: Number,
        default: 0,
      },
      comment: String,
    },
  ],
  refereeCount: {
    type: Number,
    default: 0,
  },
  total: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["next", "stop", "checking", "accept"],
    default: "checking",
  },
  adminMessageId: String,
  popularRate: {
    type: Number,
    default: 0,
  },
  rateUsers: {
    type: [String],
    default: [],
  },
});

const Track = model("Track", schema);

module.exports = Track;
