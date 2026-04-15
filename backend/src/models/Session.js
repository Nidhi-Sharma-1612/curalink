const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  // stored alongside each assistant message
  research: {
    publications: { type: Array, default: [] },
    trials: { type: Array, default: [] },
  },
  timestamp: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    // user-provided context, updated on each structured submit
    context: {
      patientName: { type: String, default: '' },
      disease: { type: String, default: '' },
      location: { type: String, default: '' },
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
