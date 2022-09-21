const {Types} = require('mongoose');
const {DataUtils} = require('../../helpers/utils');
const LogAction = require('./log_actions.model');
const LogVisits = require('./log_visits.model');

// const logger = Logger.getInstance();

const Log = {
  _getRequestInfo(req) {
    const ipAddress = req.headers['x-real-ip'] || req.info.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const userId = req.currentUserId;
    return {
      ipAddress,
      userAgent,
      userId
    };
  },

  logVisit(req, page) {
    const {ipAddress, userAgent, userId} = this._getRequestInfo(req);
    return LogVisits.create({
      page,
      ipAddress,
      userAgent,
      userId
    });
  },

  async listVisits(query) {
    const start = query.start || 0;
    const limit = query.limit || 100;

    let $match = {};
    if (query.userId) $match.userId = Types.ObjectId(query.userId);
    if (query.page) $match.page = query.page;
    if (query.show_archive) $match = {};

    const result = await DataUtils.paging({
      start,
      limit,
      sort: {created_at: -1},
      model: LogVisits,
      query: [
        {$match},
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            page: 1,
            ipAddress: 1,
            userAgent: 1,
            userId: 1,
            name: {$concat: ['$user.name.first', ' ', '$user.name.last']}
          }
        }
      ]
    });

    return result;
  },

  logAction(req, action, data) {}
};

module.exports = {
  Log,
  logVisit: req => Log.logVisit(req, req.payload.page),
  listVisits: req => Log.listVisits(req.query)
};
