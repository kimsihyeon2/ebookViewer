module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-react-app'],
      plugins: [
        '@babel/plugin-proposal-optional-chaining',
        '@babel/plugin-proposal-nullish-coalescing-operator'
      ]
    };
  };