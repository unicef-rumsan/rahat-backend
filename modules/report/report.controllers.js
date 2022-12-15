/* eslint-disable global-require */
/* eslint-disable no-underscore-dangle */
const config = require('config');
const ethers = require('ethers');
const mongoose = require('mongoose');

const {ObjectId} = mongoose.Types;
const {AgencyModel, BeneficiaryModel, VendorModel, ProjectModel} = require('../models');
const memData = require('./memData');
const ContractSetup = require('../../helpers/contractSetup');
const {address: adminAddress} = require('../../config/privateKeys/admin.json');

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

    const sentAddress = ethers.utils.recoverAddress(ethers.utils.hashMessage('rumsan'), signature);
    if (adminAddress !== sentAddress) throw new Error(`Not authorized address: ${adminAddress}`);
  },

  async _getAgency() {
    const agencies = await AgencyModel.find({});
    if (agencies.length < 1) return {message: 'Error: Agency does not exist'};
    return agencies[0];
  },

  // temporary cleanup
  getOTP(req) {
    this._isSignatureValid(req);
    return memData.otp;
  },

  async houseKeep(req) {
    const {otp, project_id, vendor_id, action} = req.headers;
    const existingContracts = {
      rahat_donor: req.headers.rahat_donor,
      rahat_registry: req.headers.rahat_registry
    };
    if (!action) return {message: 'hello there'};
    const systemOtp = this.getOTP(req);
    if (action === 'get_otp') return {otp: systemOtp};

    if (systemOtp !== parseInt(otp)) return {message: 'Error: Invalid OTP'};
    memData.resetOtp();
    if (action === 'remove_project') {
      await BeneficiaryModel.deleteMany({projects: ObjectId(project_id)});
      await ProjectModel.findByIdAndDelete(project_id);
    }
    if (action === 'remove_beneficiaries') {
      await BeneficiaryModel.deleteMany({projects: ObjectId(project_id)});
    }
    if (action === 'reset_contracts') return this.resetContracts(existingContracts);
    if (action === 'approve_vendors') return this.approveVendors(project_id);
    if (action === 'delete_vendors') return this.deleteVendors(vendor_id);
    return {success: true};
  },

  async resetContracts(existingContracts) {
    try {
      const contracts = await ContractSetup.setup(
        'UNICEF-NP',
        'UNP',
        10000000000,
        2,
        existingContracts,
        s => memData.updateContractStatus(s)
      );

      const agency = await this._getAgency();

      await AgencyModel.findByIdAndUpdate(agency.id, {
        contracts,
        startBlockNumber: contracts.blockNumber
      });

      memData.updateContractStatus('done');
      return contracts;
    } catch (e) {
      return {message: e.message};
    }
  },

  async approveVendors(project_id) {
    const project = await ProjectModel.findById(project_id);
    if (!project) return {message: 'Error: Project does not exist'};
    const agency = await this._getAgency();

    await VendorModel.updateMany(
      {},
      {projects: [project_id], agencies: [{status: 'active', agency: agency._id}]}
    );

    let vendors = await VendorModel.find({});
    vendors = vendors.map(v => v.wallet_address);
    await ContractSetup.approveVendors(agency.contracts.rahat, vendors, s =>
      memData.updateContractStatus(s)
    );
    return vendors;
  },

  async deleteVendors(_id) {
    if (_id === 'all') {
      await VendorModel.deleteMany({});
      return {message: 'All Vendors deleted'};
    }
    try {
      await VendorModel.deleteOne({_id});
    } catch (e) {}
    return {message: 'Vendors deleted'};
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
  houseKeep: req => Report.houseKeep(req),
  resetContracts: req => Report.resetContracts(req)
};
