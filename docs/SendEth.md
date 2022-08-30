```js
const httpProvider = 'http://localhost:8545';

const ethers = require('ethers');

const provider = new ethers.providers.JsonRpcProvider(httpProvider);
let wallet = new ethers.Wallet('PrivateKey');
let wallet = ethers.Wallet.fromMnemonic('Mnemonic');
wallet = wallet.connect(provider);

const lib = {
  async sendTx(to) {
    const tx = {
      from: wallet.address,
      to,
      value: ethers.utils.parseEther('10'),
      nonce: provider.getTransactionCount(wallet.address, 'latest'),
      gasLimit: ethers.utils.hexlify(100000), // 100000
      gasPrice: provider.getGasPrice()
    };

    console.log(await wallet.sendTransaction(tx));
  },

  async getBalance(provider, address) {
    const balance = await provider.getBalance(address);
    console.log(ethers.utils.formatEther(balance));
  }
};

const run = async () => {
  console.log(wallet.address);

  lib.getBalance(provider, wallet.address);
};

lib.sendTx('ToAddress');
// run();
```
