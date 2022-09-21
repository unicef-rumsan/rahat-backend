const validators = require('./log.validators');
const controllers = require('./log.controllers');
const {BENEFICIARY} = require('../../constants/permissions');

const routes = {
  logVisit: ['POST', '', 'Log user visit', [BENEFICIARY.READ]],
  listVisits: ['GET', '', 'List user visits']
};

/**
 * Register the routes
 * @param {object} app Application.
 */
function register(app) {
  app.register({
    name: 'logs',
    routes,
    validators,
    controllers
  });
}

module.exports = register;
