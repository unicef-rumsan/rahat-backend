const fs = require('fs');
const path = require('path');
const ethers = require('ethers');

const buildPath = path.join(__dirname, '../../contracts/');

const getAbiCollection = () => {
  const data = fs.readdirSync(buildPath);
  const artifact = {};
  for (let i = 0; i < data.length; i++) {
    const content = fs.readFileSync(buildPath + data[i]).toString('utf8');
    const name = `${data[i].replace(/\.[^/.]+$/, '')}`;
    const {abi, contractName, bytecode} = JSON.parse(content);
    artifact[name] = {abi, contractName, bytecode};
  }
  return artifact;
};

const getContractJson = contract => {
  if (contract === 'rahat') contract = 'Rahat';
  if (contract === 'rahat_donor') contract = 'RahatDonor';
  if (contract === 'rahat_registry') contract = 'RahatRegistry';
  if (contract === 'rahat_erc20') contract = 'RahatERC20';
  if (contract === 'rahat_erc1155') contract = 'RahatERC1155';
  if (contract === 'rahat_admin') contract = 'RahatAdmin';
  if (contract === 'rahat_trigger') contract = 'RahatTriggerResponse';
  return require(`../../contracts/${contract}.json`);
};

const getBytecode = contract => {
  const {contractName, abi, bytecode} = getContractJson(contract);
  return {contractName, abi, bytecode};
};

const getAbi = contract => {
  const {contractName, abi} = getContractJson(contract);
  return {contractName, abi};
};

const getInterface = async contractName => {
  try {
    const ABI = await getAbi();
    const contractABI = ABI[contractName].abi;
    const iface = new ethers.utils.Interface(contractABI);
    return iface;
  } catch (e) {
    return e;
  }
};

module.exports = {
  getAbi,
  getAbiCollection,
  getBytecode,
  getInterface
};
