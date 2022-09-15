const controllers = require('./stats.controllers');

const routes = {
  listBenGeo: ['GET', '/beneficiaries/geo', '-'],
  benByWard: ['GET', '/beneficiaries/ward', '-'],
  benByGender: ['GET', '/beneficiaries/gender', '-'],
  benByBanked: ['GET', '/beneficiaries/bank', '-'],
  benByPhone: ['GET', '/beneficiaries/phone', '-'],
  summary: ['GET', '/beneficiaries/summary', '-']
};

/**
 * Register the routes
 * @param {object} app Application.
 */
function register(app) {
  app.register({
    name: 'stats',
    routes,
    controllers
  });
}

module.exports = register;
