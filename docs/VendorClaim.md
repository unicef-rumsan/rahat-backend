```js
const privateKey = '[YourPrivateKey]';
const rahatServer = 'http://localhost:3601';
const httpProvider = 'http://localhost:8545';
const benificiaryPhone = '60';
const claimAmount = '10';
const otp = '9670';

const axios = require('axios');
const ethers = require('ethers');
const web3 = require('web3');

const provider = new ethers.providers.WebSocketProvider(httpProvider);
const adminWallet = new ethers.Wallet(privateKey, provider);
let vendorWallet = new ethers.Wallet.createRandom();
vendorWallet = vendorWallet.connect(provider);

let serverWallet = new ethers.Wallet.createRandom();
serverWallet = serverWallet.connect(provider);

const lib = {
  async sendEth(wallet) {
    const tx = {
      from: adminWallet.address,
      to: wallet,
      value: ethers.utils.parseEther('1'),
      nonce: provider.getTransactionCount(adminWallet.address, 'latest'),
      gasLimit: ethers.utils.hexlify(100000), // 100000
      gasPrice: provider.getGasPrice()
    };

    return adminWallet.sendTransaction(tx);
  },

  async getContract(contractName, contract_property, wallet) {
    let res = await axios(`${rahatServer}/api/v1/app/contracts/${contractName}`);
    const {abi} = res.data;
    res = await axios(`${rahatServer}/api/v1/app/settings`);
    const contractAddress = res.data.agency.contracts[contract_property];
    return new ethers.Contract(contractAddress, abi, wallet);
  },

  async run() {
    console.log('Admin Wallet:', adminWallet.address);
    const Admin_Rahat = await this.getContract('Rahat', 'rahat', adminWallet);
    const Vendor_Rahat = await this.getContract('Rahat', 'rahat', vendorWallet);
    const Vendor_RahatERC20 = await this.getContract('RahatERC20', 'rahat_erc20', provider);
    console.log(
      'Begin Balance:',
      (await Vendor_RahatERC20.balanceOf(vendorWallet.address)).toNumber()
    );

    const Server_Rahat = await this.getContract('Rahat', 'rahat', serverWallet);

    await Admin_Rahat.addVendor(vendorWallet.address);
    await Admin_Rahat.addServer(serverWallet.address);
    await this.sendEth(vendorWallet.address);
    await this.sendEth(serverWallet.address);

    await Vendor_Rahat.createERC20Claim(benificiaryPhone, claimAmount);

    const otpHash = web3.utils.soliditySha3({type: 'string', value: otp});
    await Server_Rahat.approveERC20Claim(vendorWallet.address, benificiaryPhone, otpHash, 2000);

    await Vendor_Rahat.getERC20FromClaim(benificiaryPhone, otp);
    console.log(
      'End Balance:',
      (await Vendor_RahatERC20.balanceOf(vendorWallet.address)).toNumber()
    );
  }
};

lib.run();
```
