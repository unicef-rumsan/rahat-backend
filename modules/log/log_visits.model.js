const {ObjectId} = require('mongoose');
const mongoose = require('mongoose');

const schema = mongoose.Schema(
  {
    userId: {type: ObjectId},
    page: String,
    ipAddress: String,
    userAgent: String
  },
  {
    collection: 'log_visits',
    timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'},
    toObject: {virtuals: true},
    toJSON: {virtuals: true}
  }
);

module.exports = mongoose.model('LogVisit', schema);
