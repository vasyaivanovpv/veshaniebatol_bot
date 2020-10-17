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
  scores: [
    {
      referee: Number,
      score: {
        type: Number,
        default: 0,
      },
    },
  ],
  refereeCount: Number,
  total: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["next", "stop", "checking"],
    default: "checking",
  },
  adminMessageId: String,
});

const Track = model("Track", schema);

module.exports = Track;
