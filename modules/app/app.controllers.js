/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-underscore-dangle */
const fs = require('fs');
const ethers = require('ethers');
const config = require('config');
const axios = require('axios');

const network = config.get('blockchain.httpProvider');
const provider = new ethers.providers.JsonRpcProvider(network);

const packageJson = require('../../package.json');
const {Agency} = require('../agency/agency.controllers');
const {Project} = require('../project/project.controllers');
const {Vendor} = require('../vendor/vendor.controllers');
const {Mobilizer} = require('../mobilizer/mobilizer.controllers');
const {Beneficiary} = require('../beneficiary/beneficiary.controllers');
const {Institution} = require('../institution/institution.controllers');
const PermissionsConstants = require('../../constants/permissions');
const {ObjectUtils} = require('../../helpers/utils');

const serverPK = require('../../config/privateKeys/server.json');
const {getAbi, getBytecode} = require('../../helpers/blockchain/abi');
const {User, getByWalletAddress} = require('../user/user.controllers');
const {Role} = require('../user/role.controllers');
const {deployContract} = require('../../helpers/blockchain/contract');

const _getAddressFromPrivateKeyJson = jsonFileName => {
  try {
    const json = require(`../../config/privateKeys/${jsonFileName}.json`);
    return json.address;
  } catch (e) {
    return null;
  }
};

const App = {
  async setupWallet() {
    const agency = await Agency.getFirst();
    if (agency) throw new Error('Server has already been setup.');
    // Create Admin role
    const permissions = ObjectUtils.getAllValues(PermissionsConstants);
    await Role.add({
      name: 'Admin',
      permissions,
      is_system: true
    });

    // Setup new wallet for the server.
    // Please make sure you backup the private key securely.
    // const wallet = ethers.Wallet.createRandom();
    // fs.writeFileSync(adminPK, JSON.stringify({privateKey: wallet.privateKey}));
    // this.saveSetting('wallet_address', wallet.address);
    // return {address: wallet.address};
  },

  async setup(payload, contracts) {
    let isSetup = false;
    let agency = await Agency.getFirst();
    if (agency) isSetup = true;
    if (isSetup) throw new Error('Server has already been setup.');
    const {token, admin} = payload;
    try {
      if (!contracts)
        contracts = await this.setupContracts(
          admin.wallet_address,
          token.name,
          token.symbol,
          token.supply,
          payload.triggerConfirmation
        );
      // const settingsData = JSON.parse(fs.readFileSync(settingsPath));
      // settingsData.contracts = contracts;
      // fs.writeFileSync(settingsPath, JSON.stringify(settingsData));
      payload.contracts = contracts;
      agency = await Agency.add(payload);
      await Agency.approve(agency._id);
      payload.admin.roles = ['Admin'];
      payload.admin.agency = agency._id;
      payload.admin.wallet_address = payload.admin.wallet_address.toLowerCase();
      await User.create(payload.admin);
      const settings = await this.listSettings();
      settings.user = await getByWalletAddress(payload.admin.wallet_address);

      return settings;
    } catch (e) {
      throw Error(e);
    }
  },

  async listSettings(req, h) {
    const agency = await Agency.getFirst();
    if (!agency) return h.response({isSetup: false}).code(404);
    const addresses = {
      server: serverPK.address,
      redeeem: serverPK.address,
      donor: _getAddressFromPrivateKeyJson('donor'),
      admin: _getAddressFromPrivateKeyJson('admin'),
      deployer: _getAddressFromPrivateKeyJson('deployer'),
      palika: _getAddressFromPrivateKeyJson('palika'),
      teamRahat: _getAddressFromPrivateKeyJson('teamRahat')
      // projectManager: _getAddressFromPrivateKeyJson('projectManager')
    };
    return {
      wallet_address: serverPK.address,
      redeem_address: serverPK.address,
      addresses,
      isSetup: agency != null,
      version: packageJson.version,
      networkUrl: config.get('blockchain.httpProvider'),
      chainId: config.get('blockchain.chainId'),
      chainWebSocket: config.get('blockchain.webSocketProvider'),
      agency
    };
  },

  async listAdmins() {
    return config.get('contractAdmins');
  },

  async getContractAbi(contractName) {
    return getAbi(contractName);
  },

  getContractBytecode(contractName) {
    return getBytecode(contractName);
  },

  async setupContracts(adminAccount, tokenName, tokenSymbol, initialSupply, triggerConfirmation) {
    console.log(adminAccount);
    console.log('+++++++Deploying contracts+++++++');
    const {abi: erc20Abi} = getAbi('RahatERC20');
    const {bytecode: erc20Bytecode} = getBytecode('RahatERC20');
    const {abi: erc1155Abi} = getAbi('RahatERC1155');
    const {bytecode: erc1155Bytecode} = getBytecode('RahatERC1155');
    const {abi: rahatAbi} = getAbi('Rahat');
    const {bytecode: rahatBytecode} = getBytecode('Rahat');
    const {abi: rahatAdminAbi} = getAbi('RahatAdmin');
    const {bytecode: rahatAdminBytecode} = getBytecode('RahatAdmin');
    const {abi: RahatTriggerResponseAbi} = getAbi('RahatTriggerResponse');
    const {bytecode: rahatTriggerResponseBytecode} = getBytecode('RahatTriggerResponse');
    try {
      console.log('1/5 : Deploying RahatERC20');
      const rahat_erc20 = await deployContract(erc20Abi, erc20Bytecode, [
        tokenName,
        tokenSymbol,
        adminAccount
      ]);
      console.log({rahat_erc20});
      console.log('2/5 : Deploying RahatERC1155');
      const rahat_erc1155 = await deployContract(erc1155Abi, erc1155Bytecode, [adminAccount]);
      console.log({rahat_erc1155});
      console.log('3/5 : Deploying TriggerResponse');
      const rahat_trigger = await deployContract(
        RahatTriggerResponseAbi,
        rahatTriggerResponseBytecode,
        [adminAccount, triggerConfirmation]
      );
      console.log({rahat_trigger});
      console.log('4/5 : Deploying Rahat');
      const rahat = await deployContract(rahatAbi, rahatBytecode, [
        rahat_erc20,
        rahat_trigger,
        adminAccount
      ]);
      console.log({rahat});
      console.log('5/5 : Deploying RahatAdmin');
      const rahat_admin = await deployContract(rahatAdminAbi, rahatAdminBytecode, [
        rahat_erc20,
        rahat,
        initialSupply,
        adminAccount
      ]);
      console.log({rahat_admin});

      console.log('Deployment Completed');
      return {rahat_erc20, rahat_erc1155, rahat, rahat_admin, rahat_trigger};
    } catch (e) {
      throw Error(`ERROR:${e}`);
    }
  },

  async getWalletBalance() {
    const server = ethers.utils.formatEther(await provider.getBalance(serverPK.address));
    const donor = ethers.utils.formatEther(
      await provider.getBalance(_getAddressFromPrivateKeyJson('donor'))
    );
    const admin = ethers.utils.formatEther(
      await provider.getBalance(_getAddressFromPrivateKeyJson('admin'))
    );
    const deployer = ethers.utils.formatEther(
      await provider.getBalance(_getAddressFromPrivateKeyJson('deployer'))
    );
    const palika = ethers.utils.formatEther(
      await provider.getBalance(_getAddressFromPrivateKeyJson('palika'))
    );
    const teamRahat = ethers.utils.formatEther(
      await provider.getBalance(_getAddressFromPrivateKeyJson('teamRahat'))
    );
    return {admin, deployer, donor, palika, server, teamRahat};
  },

  async getDashboardData(currentUser) {
    const projectCount = await Project.countProject(currentUser);
    const vendorCount = await Vendor.countVendor(currentUser);
    const beneficiary = await Beneficiary.countBeneficiary(currentUser);
    const mobilizerCount = await Mobilizer.countMobilizer(currentUser);
    const tokenAllocation = await Project.getTokenAllocated(currentUser);
    const tokenRedemption = await Vendor.countVendorTokenRedemption();
    const institutionCount = await Institution.countInstitution(currentUser);
    return {
      projectCount,
      vendorCount,
      institutionCount,
      beneficiary,
      mobilizerCount,
      tokenAllocation,
      tokenRedemption
    };
  },

  async setKobotoolbox(payload) {
    const {currentUser} = payload;
    const agency = await Agency.update(currentUser.agency, {
      kobotool_auth: {kpi: payload.kpi, token: payload.token}
    });
    return agency;
  },

  async getKoboForms(currentUser) {
    try {
      const {kobotool_auth} = await Agency.getById(currentUser.agency);
      const {data} = await axios.get(`https://${kobotool_auth.kpi}/api/v2/assets.json`, {
        headers: {Authorization: `Token ${kobotool_auth.token}`}
      });
      data.results = data.results.filter(
        el => el.has_deployment && el.name === 'Beneficiary Onboard'
      );
      const assets = await Agency.setKoboAssets(currentUser.agency, data.results);
      return assets;
    } catch (e) {
      console.log(e);
      return e;
    }
  },

  async getKoboFormsData(currentUser, assetId) {
    try {
      const {kobotool_auth, kobotool_assets} = await Agency.getById(currentUser.agency);
      const {data} = await axios.get(
        `https://${kobotool_auth.kpi}/api/v2/assets/${
          assetId || kobotool_assets[0].asset_id
        }/data?format=json`,
        {headers: {Authorization: `Token ${kobotool_auth.token}`}}
      );
      return {count: data.count, data: data.results};
    } catch (e) {
      return e;
    }
  },

  async setDefaultProject(payload) {
    const {_id} = await Agency.getFirst();
    const agency = await Agency.update(_id, {
      default_project: payload.default_project
    });
    return agency;
  }
};

module.exports = {
  App,
  setup: req => {
    console.log(req.payloadx);
    return App.setup(req.payload);
  },
  listAdmins: () => App.listAdmins(),
  setupWallet: req => App.setupWallet(),
  listSettings: (req, h) => App.listSettings(req, h),
  getContractAbi: req => App.getContractAbi(req.params.contractName),
  getContractBytecode: req => App.getContractBytecode(req.params.contractName),
  setupContracts: req => App.setupContracts(),
  getDashboardData: req => App.getDashboardData(req.currentUser),
  setKobotoolbox: req => App.setKobotoolbox(req.payload),
  getKoboForms: req => App.getKoboForms(req.currentUser),
  getKoboFormsData: req => App.getKoboFormsData(req.currentUser, req.params.assetId),
  setDefaultProject: req => App.setDefaultProject(req.payload),
  getWalletBalance: App.getWalletBalance
};
