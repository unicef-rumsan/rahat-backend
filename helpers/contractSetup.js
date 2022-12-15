const ethers = require('ethers');
const {getBytecode} = require('./blockchain/abi');
const {
  deployContract,
  getContract,
  getWalletFromPrivateKey,
  provider
} = require('./blockchain/contract');

const DeployerPK = require('../config/privateKeys/deployer.json');
const DonorPK = require('../config/privateKeys/donor.json');
const AdminPK = require('../config/privateKeys/admin.json');
const PalikaPK = require('../config/privateKeys/palika.json');
const ServerPK = require('../config/privateKeys/server.json');
const RahatTeamPK = require('../config/privateKeys/teamRahat.json');

const adminAccount = AdminPK.address;

function keccak256(text) {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(text));
}

module.exports = {
  async setup(tokenName, tokenSymbol, initialSupply, triggerConfirmation, contracts = {}, cb) {
    const adminBalance = ethers.utils.formatEther(await provider.getBalance(AdminPK.address));
    if (adminBalance < 2)
      throw new Error(
        `Admin ETH balance must be greater than 3. Please send at least 2 ETH to ${AdminPK.address}`
      );
    console.log('+++++++Deploying contracts+++++++');
    const {abi: donorAbi, bytecode: donorBytecode} = getBytecode('RahatDonor');
    const {abi: registryAbi, bytecode: registryBytecode} = getBytecode('RahatRegistry');
    const {abi: erc20Abi, bytecode: erc20Bytecode} = getBytecode('RahatERC20');
    const {abi: erc1155Abi, bytecode: erc1155Bytecode} = getBytecode('RahatERC1155');
    const {abi: rahatAbi, bytecode: rahatBytecode} = getBytecode('Rahat');
    const {abi: rahatAdminAbi, bytecode: rahatAdminBytecode} = getBytecode('RahatAdmin');
    const {abi: RahatTriggerResponseAbi, bytecode: rahatTriggerResponseBytecode} = getBytecode(
      'RahatTriggerResponse'
    );

    try {
      if (cb) cb('1/7 : Deploying RahatDonor');
      const rahat_donor =
        contracts.rahat_donor || (await deployContract(donorAbi, donorBytecode, [DonorPK.address]));
      console.log({rahat_donor});

      if (cb) cb('2/7 : Deploying RahatRegistry');
      const rahat_registry =
        contracts.rahat_registry ||
        (await deployContract(registryAbi, registryBytecode, [adminAccount]));
      console.log({rahat_registry});

      if (cb) cb('3/7 : Deploying RahatERC20');
      const rahat_erc20 = await deployContract(erc20Abi, erc20Bytecode, [
        tokenName,
        tokenSymbol,
        adminAccount,
        0
      ]);
      console.log({rahat_erc20});

      if (cb) cb('4/7 : Deploying RahatERC1155');
      const rahat_erc1155 = await deployContract(erc1155Abi, erc1155Bytecode, [adminAccount]);
      console.log({rahat_erc1155});

      if (cb) cb('5/7 : Deploying TriggerResponse');
      const rahat_trigger = await deployContract(
        RahatTriggerResponseAbi,
        rahatTriggerResponseBytecode,
        [adminAccount, triggerConfirmation]
      );
      console.log({rahat_trigger});

      if (cb) cb('6/7 : Deploying Rahat');
      const rahat = await deployContract(rahatAbi, rahatBytecode, [
        rahat_erc20,
        rahat_registry,
        rahat_trigger,
        PalikaPK.address
      ]);
      console.log({rahat});

      if (cb) cb('7/7 : Deploying RahatAdmin');
      const rahat_admin = await deployContract(rahatAdminAbi, rahatAdminBytecode, [
        rahat_erc20,
        adminAccount
      ]);
      console.log({rahat_admin});

      if (cb) cb('Add admin accounts');

      const AdminWallet = getWalletFromPrivateKey(AdminPK.privateKey);
      const PalikaWallet = getWalletFromPrivateKey(PalikaPK.privateKey);
      const DonorWallet = getWalletFromPrivateKey(DonorPK.privateKey);

      const sendRes = await AdminWallet.sendTransaction({
        from: AdminPK.address,
        to: rahat,
        value: ethers.utils.parseEther('5'),
        nonce: provider.getTransactionCount(AdminPK.address, 'latest'),
        gasLimit: ethers.utils.hexlify(100000), // 100000
        gasPrice: provider.getGasPrice()
      });
      const {blockNumber} = await sendRes.wait();

      const rahatDonor = getContract('RahatDonor', rahat_donor, DonorWallet);
      const rahatERC20Contract = getContract('RahatERC20', rahat_erc20, AdminWallet);
      const rahatRegistryContract = getContract('RahatRegistry', rahat_registry, AdminWallet);
      const rahatContract = getContract('Rahat', rahat, PalikaWallet);
      const rahatTriggerContract = getContract('Rahat', rahat_trigger, AdminWallet);

      await rahatERC20Contract.addOwner(rahat_admin);
      await rahatRegistryContract.addOwner(rahat);
      await rahatRegistryContract.addOwner(PalikaPK.address);
      await rahatTriggerContract.addAdmin(PalikaPK.address);
      await rahatTriggerContract.addAdmin(RahatTeamPK.address);
      await rahatContract.addAdmin(RahatTeamPK.address);
      await rahatContract.addServer(ServerPK.address);

      const rahat_cash = await rahatDonor.callStatic.createToken('Cash Tracking Token', 'CTT', 0);
      await rahatDonor.createToken('Cash Tracking Token', 'CTT', 0);

      if (cb) cb('Deployment Completed');

      return {
        blockNumber,
        rahat_donor,
        rahat_registry,
        rahat_erc20,
        rahat_cash,
        rahat_erc1155,
        rahat,
        rahat_admin,
        rahat_trigger
      };
    } catch (e) {
      throw Error(`ERROR:${e}`);
    }
  },

  async approveVendors(rahatAddress, vendors, cb) {
    const PalikaWallet = getWalletFromPrivateKey(PalikaPK.privateKey);
    const rahatContract = getContract('Rahat', rahatAddress, PalikaWallet);
    for (const vendor of vendors) {
      await rahatContract.addVendor(vendor);
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
