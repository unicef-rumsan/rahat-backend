```js
//replace payload from frontend console.
const payload = {
  name: 'Rumsan Office',
  action: 'login',
  id: 788522,
  token: '1bf22a1b02bdea0be17d03360df52d97c0804fad',
  callbackUrl: 'http://localhost:3601/api/v1/auth/wallet',
  encryptionKey:
    '36d3b882f51f687f085474ef9a9289bea3108a3c181a3b8ad75aba6a580f93bb4584a729e224f09e06f9281fd74f17474f0a77c01a5223db8f566fa34d6966a7'
};

const mnemonic = 'damage van genius guitar topic width subway brother inherit sketch keen trumpet';
// address: 0x1E43683929432f609952BfB857d1eA4231A9E9b7

const ethers = require('ethers');
const EthCrypto = require('eth-crypto');
const axios = require('axios');

const run = async () => {
  const wallet = ethers.Wallet.fromMnemonic(mnemonic);
  const encryptedWalletJson = await wallet.encrypt('967967');

  const signedData = await wallet.signMessage(payload.token);
  const data = {id: payload.id, signature: signedData};

  const encrytedWallet = await EthCrypto.encryptWithPublicKey(
    payload.encryptionKey,
    encryptedWalletJson.toString()
  );
  data.encryptedWallet = EthCrypto.cipher.stringify(encrytedWallet);
  console.log(data);

  try {
    const res = await axios.post(payload.callbackUrl, data);
  } catch (e) {
    console.log(e.message);
  }
};

run();
```
