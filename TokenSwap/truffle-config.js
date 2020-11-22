const HDWalletProvider = require('truffle-hdwallet-provider');
const fs = require('fs');

let secrets;

if (fs.existsSync('secret.json')) {
    secrets = JSON.parse(fs.readFileSync('secret.json', 'utf8'));
}

module.exports = {
    networks: {
        /*goerli: {
          provider: () => new HDWalletProvider(secrets.mnemonic, 'https://goerli.infura.io/v3/' + secrets.infuraApiKey),
          network_id: '5'
        }
      },*/
        //use ganache for development
        development: {
            host: "127.0.0.1",
            port: "7545",
            network_id: "*" // match any network id
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