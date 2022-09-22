const {ObjectId} = require('mongoose');
const mongoose = require('mongoose');

const schema = mongoose.Schema(
  {
    userId: {type: ObjectId},
    action: String,
    data: Object,
    ipAddress: String
  },
  {
    collection: 'log_actions',
    timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'},
    toObject: {virtuals: true},
    toJSON: {virtuals: true}
  }
);

module.exports = mongoose.model('LogAction', schema);
