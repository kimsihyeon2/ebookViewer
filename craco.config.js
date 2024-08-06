const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // CSS 모듈 설정을 활성화
      const cssRule = webpackConfig.module.rules.find(rule => rule.test && rule.test.toString().includes('.css'));
      if (cssRule) {
        cssRule.exclude = /\.module\.css$/;
        const cssModuleRule = { ...cssRule };
        cssModuleRule.test = /\.module\.css$/;
        cssModuleRule.modules = true;
        webpackConfig.module.rules.push(cssModuleRule);
      }
      return webpackConfig;
    },
  },
};