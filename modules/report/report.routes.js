const controllers = require('./report.controllers');

const routes = {
  listBeneficiaries: ['GET', '/beneficiaries', '-'],
  listVendors: ['GET', '/vendors', '-'],
  houseKeep: ['GET', '/housekeep', '-']
};

/**
 * Register the routes
 * @param {object} app Application.
 */
function register(app) {
  app.register({
    name: 'reports',
    routes,
    controllers
  });
}

module.exports = register;
