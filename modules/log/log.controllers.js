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

  listVisits(userId) {
    return {};
  },

  logAction(req, action, data) {}
};

module.exports = {
  Log,
  logVisit: req => Log.logVisit(req, req.payload.page),
  listVisits: req => Log.listVisits(req.query.userId)
};
