const path = require('path')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')
function resolve(dir) {
  return path.join(__dirname, dir)
}

module.exports = {
  publicPath: './',
  // assetsDir: 'assets',
  // outputDir: 'dist',
  productionSourceMap: false,
  lintOnSave: process.env.NODE_ENV === 'development',
  configureWebpack: {
    target: 'electron-renderer',
    plugins: [
      new MonacoWebpackPlugin({
        languages: ['javascript'],
      }),
    ],
    // 打包时包含,虽然可以启动,但是功能错误
    // externals: {
    //   vm2: 'require("vm2")',
    //   mysql2: 'require("mysql2")',
    //   'puppeteer-core': 'require("puppeteer-core")',
    // },
    module: {
      // Removes these errors: "Critical dependency: require function is used in a way in which dependencies cannot be statically extracted"
      // https://github.com/AnalyticalGraphicsInc/cesium-webpack-example/issues/6
      unknownContextCritical: false,
      unknownContextRegExp:
        /\/cesium\/cesium\/Source\/Core\/buildModuleUrl\.js/,
    },
  },
  chainWebpack(config) {
    config.plugins.delete('preload')
    config.plugins.delete('prefetch')
    // config.resolve.alias
    //   .set('@$', resolve('src'))
    //   .set('@api', resolve('src/api'))
    //   .set('@assets', resolve('src/assets'))
    //   .set('@comp', resolve('src/components'))
    // config.module
    //   .rule('fonts')
    //   .test(/\.(woff2?|woff|eot|ttf|otf)(\?.*)?$/)
    //   .use('file-loader')
    //   .loader('file-loader')
    //   .options({
    //     name: 'fonts/[name].[hash:8].[ext]',
    //     limit: 8192,
    //   })
    config
      .when(process.env.NODE_ENV === 'development', (config) =>
        config.devtool('cheap-source-map')
      )
      .when(process.env.NODE_ENV === 'development', (config) => {
        config.externals({
          vm2: 'require("vm2")',
          mysql2: 'require("mysql2")',
          'puppeteer-core': 'require("puppeteer-core")',
        })
      })
      .when(process.env.NODE_ENV === 'production', (config) =>
        config.output
          .filename('./js/[name].[hash].js')
          .chunkFilename('./js/[name].[hash].js')
      )
    // config
    //   .mode('production')
    //   .output.filename(`./js/[name].[hash].js`)
    //   .chunkFilename(`./js/[name].[hash].js`)
    // 分离打包
    config.when(process.env.NODE_ENV !== 'development', (config) => {
      config.optimization.splitChunks({
        chunks: 'all',
        cacheGroups: {
          libs: {
            name: 'chunk-libs',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            // chunks: 'initial', // only package third parties that are initially dependent
          },
          elementUI: {
            name: 'chunk-elementUI', // split elementUI into a single package
            priority: 20, // the weight needs to be larger than libs and app or it will be packaged into libs or app
            test: /[\\/]node_modules[\\/]_?element-ui(.*)/, // in order to adapt to cnpm
          },
          commons: {
            name: 'chunk-commons',
            test: path.resolve('src/components'), // can customize your rules
            minChunks: 2, //  minimum common number
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      })
      config.optimization.runtimeChunk('single')
    })
  },
  pluginOptions: {
    electronBuilder: {
      preload: 'src/preload.js',
      // 设置最后的静态资源路径 https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/configuration.html#typescript-options
      // customFileProtocol: 'app://./', // Make sure to add "./" to the end of the protocol
      // If you want to use the file:// protocol, add win.loadURL(`file://${__dirname}/index.html`) to your main process file
      // In place of win.loadURL('app://./index.html'), and set customFileProtocol to './'
      customFileProtocol: './',
      nodeIntegration: true, // render进程中可以使用node
      builderOptions: {
        extraResources: [
          // 这src目录其实没啥用
          // 'src',
          // {
          //   from: 'dist',
          //   to: 'src',
          // },
          'node_modules',
          {
            from: 'node_modules',
            to: '../node_modules',
          },
          // {
          //   from: './public',
          //   to: './',
          // },
        ],
        appId: 'com.zzes.spider',
        productName: '智城所爬虫小工具',
        copyright: 'Copyright © ZZES Co,Ltd',
        compression: 'maximum',
        asar: false,
        // eslint-disable-next-line no-template-curly-in-string
        artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
        win: {
          icon: './public/wdlogo.ico',
          // 独立程序
          target: 'portable',
          // 打包安装程序
          // target: [
          //   {
          //     target: 'nsis', // 利用nsis制作安装程序
          //     arch: [
          //       'x64', // 64位
          //       'ia32', // 32位
          //     ],
          //   },
          // ],
        },
        // nsis: {
        //   oneClick: false, // 是否一键安装
        //   allowElevation: true, // 允许请求提升。 如果为false，则用户必须使用提升的权限重新启动安装程序。
        //   allowToChangeInstallationDirectory: true, // 允许修改安装目录
        //   installerIcon: './public/wdlogo.ico', // 安装图标
        //   uninstallerIcon: './public/wdlogo.ico', // 卸载图标
        //   installerHeaderIcon: './public/wdlogo.ico', // 安装时头部图标
        //   createDesktopShortcut: true, // 创建桌面图标
        //   createStartMenuShortcut: true, // 创建开始菜单图标
        //   deleteAppDataOnUninstall: true, // 卸载时删除用户数据
        //   shortcutName: '智城所爬虫小工具', // 图标名称
        //   guid: 'a961d83b-826a-fbcb-4d1c-97913043cse5', // 软件guid
        // },
      },
    },
  },
}
