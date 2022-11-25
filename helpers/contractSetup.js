const ethers = require('ethers');
const {getAbi, getBytecode} = require('./blockchain/abi');
const {deployContract, getContract, getWalletFromPrivateKey} = require('./blockchain/contract');

const AdminPK = require('../config/privateKeys/admin.json');
const PalikaPK = require('../config/privateKeys/palika.json');
const ServerPK = require('../config/privateKeys/server.json');
const RahatTeamPK = require('../config/privateKeys/teamRahat.json');

const adminAccount = AdminPK.address;

function keccak256(text) {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(text));
}

module.exports = {
  async setup(tokenName, tokenSymbol, initialSupply, triggerConfirmation, cb) {
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
      if (cb) cb('1/5 : Deploying RahatERC20');
      const rahat_erc20 = await deployContract(erc20Abi, erc20Bytecode, [
        tokenName,
        tokenSymbol,
        adminAccount
      ]);
      console.log({rahat_erc20});

      if (cb) cb('2/5 : Deploying RahatERC1155');
      const rahat_erc1155 = await deployContract(erc1155Abi, erc1155Bytecode, [adminAccount]);
      console.log({rahat_erc1155});

      if (cb) cb('3/5 : Deploying TriggerResponse');
      const rahat_trigger = await deployContract(
        RahatTriggerResponseAbi,
        rahatTriggerResponseBytecode,
        [adminAccount, triggerConfirmation]
      );
      console.log({rahat_trigger});

      if (cb) cb('4/5 : Deploying Rahat');
      const rahat = await deployContract(rahatAbi, rahatBytecode, [
        rahat_erc20,
        rahat_trigger,
        adminAccount
      ]);
      console.log({rahat});

      if (cb) cb('5/5 : Deploying RahatAdmin');
      const rahat_admin = await deployContract(rahatAdminAbi, rahatAdminBytecode, [
        rahat_erc20,
        rahat,
        initialSupply,
        adminAccount
      ]);
      console.log({rahat_admin});

      if (cb) cb('Addmin admin accounts');

      const AdminWallet = getWalletFromPrivateKey(AdminPK.privateKey);
      const rahatContract = getContract('Rahat', rahat, AdminWallet);
      const rahatTriggerContract = getContract('Rahat', rahat_trigger, AdminWallet);

      await rahatContract.addPalika(PalikaPK.address);
      await rahatContract.addServer(ServerPK.address);
      await rahatContract.addAdmin(RahatTeamPK.address);
      await rahatTriggerContract.addAdmin(PalikaPK.address);
      await rahatTriggerContract.addAdmin(RahatTeamPK.address);

      if (cb) cb('Deployment Completed');

      return {rahat_erc20, rahat_erc1155, rahat, rahat_admin, rahat_trigger};
    } catch (e) {
      throw Error(`ERROR:${e}`);
    }
  },

  async approveVendors(rahatAddress, vendors, cb) {
    const AdminWallet = getWalletFromPrivateKey(AdminPK.privateKey);
    const rahatContract = getContract('Rahat', rahatAddress, AdminWallet);
    for (const vendor of vendors) {
      await rahatContract.grantRole(keccak256('VENDOR'), vendor);
      console.log(await rahatContract.isVendor(vendor));
      if (cb) cb(`Vendor approved:${vendor}`);
    }
  }
};

// lib.setupContracts(
//   '0x464D165292b4a7C39785E455ABbA0E2Ef091c85a',
//   'Test',
//   'TST',
//   1000,
//   2,
//   () => console.log
// );
