require('dotenv').config()
console.log(process.env)

module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ["module-resolver", {
        "alias": {
          "@dispatch-services/app-forum-store": "./src/app-forum-store/src",
          "@dispatch-services/store": "./src/store/src",
          "@dispatch-services/db-forum-common": "./src/db-forum-common/src",
          "@dispatch-services/utils-common": "./src/utils-common/src",
          "crypto": "./node_modules/crypto-js"
        },
        "extensions": [
          ".js",
          ".jsx",
          ".ts",
          ".tsx",
        ]
      }],
      ['transform-inline-environment-variables', {
        "include": ["NODE_ENV", "SOLARPLEX_REALM", "FORUM"],
      }],
    ]
  };
};
