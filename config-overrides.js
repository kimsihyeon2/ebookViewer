const path = require('path');
const { override, addBabelPlugin } = require('customize-cra');

module.exports = override(
  // Babel 플러그인 추가
  addBabelPlugin('@babel/plugin-proposal-optional-chaining'),
  addBabelPlugin('@babel/plugin-proposal-nullish-coalescing-operator'),

  // 기존 webpack 설정 오버라이드
  (config, env) => {
    config.output = {
      ...config.output,
      filename: 'static/js/[name].js',
      chunkFilename: 'static/js/[name].chunk.js',
    };
    
    return config;
  }
);
