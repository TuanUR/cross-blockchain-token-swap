const HDWalletProvider = require('truffle-hdwallet-provider');
// const infuraKey = "fj4jll3k.....";
//
// const fs = require('fs');
// const mnemonic = fs.readFileSync(".secret").toString().trim();

const fs = require('fs');

let secrets;

if(fs.existsSync('secret.json')) {
  secrets = JSON.parse(fs.readFileSync('secret.json', 'utf8'));
}

module.exports = {
  networks: {
    ropsten: {
      provider: () => new HDWalletProvider(secrets.mnemonic, 'https://ropsten.infura.io/v3/' + secrets.infuraApiKey, 0, 2),
      network_id: '3'
    },
    goerli: {
      provider: () => new HDWalletProvider(secrets.mnemonic, 'https://goerli.infura.io/v3/' + secrets.infuraApiKey, 0, 2),
      network_id: '5'
    },
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*" // Match any network id
    },
    develop: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
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
