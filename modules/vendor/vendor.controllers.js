const ethers = require('ethers');
const { Types } = require('mongoose');
const { addFileToIpfs } = require('../../helpers/utils/ipfs');
const Logger = require('../../helpers/logger');
const { DataUtils } = require('../../helpers/utils');
const { VendorModel } = require('../models');
const { TokenRedemption } = require('./vendorTokenRedemption.model');
const { VendorConstants } = require('../../constants');
const { Agency } = require('../agency/agency.controllers');
const { tokenTransaction } = require('../../helpers/blockchain/tokenTransaction');
const tokenRedemptionModel = require('./vendorTokenRedemption.model');

const logger = Logger.getInstance();

const Vendor = {
	async add(payload) {
		payload.agencies = [{ agency: payload.currentUser.agency }];
		const ipfsIdHash = await this.uploadToIpfs(this.decodeBase64Image(payload.govt_id_image).data);
		const ipfsPhotoHash = await this.uploadToIpfs(this.decodeBase64Image(payload.photo).data);
		payload.govt_id_image = ipfsIdHash;
		payload.photo = ipfsPhotoHash;
		return VendorModel.create(payload);
	},

	async register(agencyId, payload) {
		payload.agencies = [{ agency: agencyId }];
		const ipfsIdHash = await this.uploadToIpfs(this.decodeBase64Image(payload.govt_id_image).data);
		const ipfsPhotoHash = await this.uploadToIpfs(this.decodeBase64Image(payload.photo).data);
		payload.govt_id_image = ipfsIdHash;
		payload.photo = ipfsPhotoHash;
		return VendorModel.create(payload);
	},

	decodeBase64Image(dataString) {
		if (!dataString) return { type: null, data: null };
		const matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
		const response = {};
		if (matches.length !== 3) {
			return new Error('Invalid input string');
		}
		response.type = matches[1];
		response.data = new Buffer(matches[2], 'base64');
		return response;
	},
	async uploadToIpfs(file) {
		if (!file) return '';
		const ipfsHash = await addFileToIpfs(file);
		return ipfsHash.cid.toString();
	},

	// Approve after event from Blockchain
	async approve(wallet_address, currentUser) {
		return VendorModel.findOneAndUpdate(
			{ wallet_address, agencies: { $elemMatch: { agency: Types.ObjectId(currentUser.agency) } } },
			{ $set: { 'agencies.$.status': VendorConstants.status.Active } },
			{ new: true }
		);
	},
	async changeStatus(id, payload, currentUser) {
		const { status } = payload;
		return VendorModel.findOneAndUpdate(
			{ _id: id, agencies: { $elemMatch: { agency: Types.ObjectId(currentUser.agency) } } },
			{ $set: { 'agencies.$.status': status } },
			{ new: true }
		);
	},

	getbyId(id, currentUser) {
		return VendorModel.findOne({ _id: id });
	},

	getbyWallet(wallet_address, currentUser) {
		return VendorModel.findOne({ wallet_address });
	},

	list(query, currentUser) {
		const start = query.start || 0;
		const limit = query.limit || 20;
		const $match = {
			is_archived: false,
			agencies: { $elemMatch: { agency: Types.ObjectId(currentUser.agency) } }
		};
		if (query.show_archive) $match.is_archived = true;
		if (query.phone) $match.phone = { $regex: new RegExp(`${query.phone}`), $options: 'i' };
		if (query.name) $match.name = { $regex: new RegExp(`${query.name}`), $options: 'i' };

		const sort = {};
		if (query.sort === 'address' || query.sort === 'name') sort[query.sort] = 1;
		else sort.created_at = -1;

		return DataUtils.paging({
			start,
			limit,
			sort,
			model: VendorModel,
			query: [{ $match }]
		});
	},

	async remove(id, curUserId) {
		const ben = await VendorModel.findOneAndUpdate(
			{ _id: id },
			{ is_archived: true, updated_by: curUserId },
			{ new: true }
		);
		// TODO blockchain call
		return ben;
	},

	update(id, payload) {
		delete payload.status;
		delete payload.balance;
		delete payload.agency;

		return VendorModel.findOneAndUpdate({ _id: id, is_archived: false }, payload, {
			new: true,
			runValidators: true
		});
	},
	countVendor(currentUser) {
		const query = { is_archived: false };
		query.agencies = { $elemMatch: { agency: Types.ObjectId(currentUser.agency) } };

		return VendorModel.find(query).countDocuments();
	},

	async getTransactions(id, tokenAddress) {
		const vendor = await this.getbyId(id);
		const transactions = await tokenTransaction(tokenAddress, vendor.wallet_address);
		return transactions;
	},

	async addTokenRedemption(payload) {
		return tokenRedemptionModel.create(payload);
	},

	async countVendorTokenRedemption() {
		// const query = { vendor_wallet: vendorWallet };
		const total = await tokenRedemptionModel.aggregate([
			{ $group: { _id: '$vendor_wallet', totalSum: { $sum: '$amount' } } }
		]);
		const totalToken = total.reduce((acc, obj) => acc + obj.totalSum, 0);
		console.log({ totalTokenRedemption: totalToken, tokenRedemption: total });

		return { totalTokenRedemption: totalToken, tokenRedemption: total };
	}
};

module.exports = {
	Vendor,
	add: req => Vendor.add(req.payload),
	getbyId: req => {
		const { id } = req.params;
		if (ethers.utils.isAddress(id)) return Vendor.getbyWallet(id, req.currentUser);
		return Vendor.getbyId(req.params.id, req.currentUser);
	},
	list: req => Vendor.list(req.query, req.currentUser),
	remove: req => Vendor.remove(req.params.id, req.currentUserId),
	update: req => Vendor.update(req.params.id, req.payload),
	approve: req => Vendor.approve(req.payload.wallet_address, req.currentUser),
	changeStatus: req => Vendor.changeStatus(req.params.id, req.payload, req.currentUser),
	register: async req => {
		const { _id: agencyId } = await Agency.getFirst();
		return Vendor.register(agencyId, req.payload);
	},
	getTransactions: async req => {
		const {
			contracts: { token: tokenAddress }
		} = await Agency.getFirst();
		return Vendor.getTransactions(req.params.id, tokenAddress);
	}
};
