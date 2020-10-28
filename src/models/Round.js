const { Schema, model } = require("mongoose");

const schema = new Schema({
  index: Number,
  name: String,
  status: {
    type: String,
    enum: ["active", "finished", "awaiting"],
    default: "awaiting",
  },
  innerStatus: {
    type: String,
    enum: ["receiving", "scoring", "ending"],
    default: "receiving",
  },
  isPaired: Boolean,
  theme: String,
  minScore: Number,
  countReferee: Number,
  finishedAt: Date,
  actualSheetRow: Number,
});

const Round = model("Round", schema);

module.exports = Round;
