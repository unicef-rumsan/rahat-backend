const config = require('config');
const {BeneficiaryModel, VendorModel} = require('../models');

const Report = {
  _checkToken(token) {
    if (!config.has('app.report_token'))
      throw new Error('report_token is not specified in configuration.');
    if (!token) throw new Error('Must send report_token in headers.');
    if (config.get('app.report_token') !== token) throw new Error('Invalid report_token sent.');
  },

  listBeneficiaries(req) {
    this._checkToken(req.headers.report_token);
    return BeneficiaryModel.find({});
  },

  listVendors(req) {
    this._checkToken(req.headers.report_token);
    return VendorModel.find({});
  }
};

module.exports = {
  listBeneficiaries: req => Report.listBeneficiaries(req),
  listVendors: req => Report.listVendors(req)
};
