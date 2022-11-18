/* eslint-disable global-require */
/* eslint-disable no-underscore-dangle */
const config = require('config');
const ethers = require('ethers');
const mongoose = require('mongoose');

const {ObjectId} = mongoose.Types;
const {BeneficiaryModel, VendorModel, ProjectModel} = require('../models');

class clsOtp {
  constructor() {
    this.reset();
  }

  reset() {
    this.value = Math.floor(Math.random() * 9999999999) + 100000000;
  }
}

const OTP = new clsOtp();

const Report = {
  _checkToken(req) {
    const token = req.headers.report_token;
    if (!config.has('app.report_token'))
      throw new Error('report_token is not specified in configuration.');
    if (!token) throw new Error('Must send report_token in headers.');
    if (config.get('app.report_token') !== token) throw new Error('Invalid report_token sent.');
  },

  _isSignatureValid(req) {
    const {signature} = req.headers;
    const {address} = require('../../config/privateKeys/admin.json');
    const sentAddress = ethers.utils.recoverAddress(ethers.utils.hashMessage('rumsan'), signature);
    if (address !== sentAddress) throw new Error(`Not authorized address: ${address}`);
  },

  // temporary cleanup
  getOTP(req) {
    this._isSignatureValid(req);
    return OTP.value;
  },

  async houseKeep(req) {
    const {otp, project_id, action} = req.headers;
    console.log(project_id);
    if (!action) return {message: 'hello there'};
    const systemOtp = this.getOTP(req);
    if (action === 'get_otp') return {otp: systemOtp};
    if (action === 'remove_project') {
      if (systemOtp !== parseInt(otp)) throw new Error(`Invalid OTP`);
      OTP.reset();
      await BeneficiaryModel.deleteMany({projects: ObjectId(project_id)});
      await ProjectModel.findByIdAndDelete(project_id);
    }
    return {success: true};
  },

  // reports
  listBeneficiaries(req) {
    this._checkToken(req);
    return BeneficiaryModel.find({});
  },

  listVendors(req) {
    this._checkToken(req);
    return VendorModel.find({});
  },

  listProjects(req) {
    this._checkToken(req);
    return ProjectModel.find({});
  }
};

module.exports = {
  listBeneficiaries: req => Report.listBeneficiaries(req),
  listVendors: req => Report.listVendors(req),
  listProjects: req => Report.listProjects(req),
  houseKeep: req => Report.houseKeep(req)
};
