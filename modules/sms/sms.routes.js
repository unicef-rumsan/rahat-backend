const controllers = require('./sms.controller');
const validators = require('./sms.validator');
const {BENEFICIARY} = require('../../constants/permissions');

const routes = {
  sendSmsOnTokenIssue: [
    'POST',
    '/token',
    'Send SMS when token issued',
    [BENEFICIARY.WRITE, BENEFICIARY.ADMIN]
  ],
  sendSmsOnPackageIssue: [
    'POST',
    '/package',
    'Send SMS when package issued',
    [BENEFICIARY.WRITE, BENEFICIARY.ADMIN]
  ]
};

/**
 * Register the routes
 * @param {object} app Application.
 */
function register(app) {
  app.register({
    name: 'sms',
    routes,
    validators,
    controllers
  });
}

module.exports = register;
