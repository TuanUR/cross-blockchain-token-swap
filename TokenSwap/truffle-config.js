const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');

let secrets;

if(fs.existsSync('secret.json')) {
  secrets = JSON.parse(fs.readFileSync('secret.json', 'utf8'));
}

module.exports = {
  networks: {
    goerli: {
      provider: () => new HDWalletProvider(secrets.mnemonic, 'https://goerli.infura.io/v3/' + secrets.infuraApiKey),
      network_id: '5'
    }
  },

  // Set default mocha options here, use special reporters etc.
  mocha: {
    // timeout: 100000
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "^0.6.0",    // Fetch exact version from solc-bin (default: truffle's version)
    },
  },
};