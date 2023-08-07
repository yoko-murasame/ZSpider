# 治电爬虫程序

### 功能

 - 夜间模式
 - 创建/修改应用
 - 导入/导出应用
 - 数据采集
 - 数据发布 (MySQL), 可导出Excel, JSON文件
 - 本地应用上传, 远程应用获取
 - 客户端与服务端通信
 - 新增代码应用
 - 插入代码片段功能

### 开发与打包

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:9080
npm run serve

# build electron application for production
npm run build


# lint all JS/Vue component files in `src/`
npm run lint

```

### 相关问题
#### 1.导入示例应用
a.文件夹名称: `example`

b.应用: 

 - house365应用.zpk
 - 代码测试应用.zpk

c.导入
在主页面点击导入应用, 选取`.zpk`文件导入即可


#### 2.代码应用相关调用类库和方法
```javascript
{ name: 'fs', info: 'NodeJS内置文件操作库' }
{ name: 'path', info: 'NodeJS内置路径操作库' }
{ name: 'reqest', info: 'HTTP请求库' }
{ name: 'request-promise', info: '基于Promise的HTTP请求库' }
{ name: 'cheerio', info: 'HTML解析库' }
{ name: 'cheerio-tableparser', info: 'HTML表格解析的Cheerio插件' }
{ name: 'mysql2', info: 'MySQL操作库' }
{ name: 'puppeteer-core', info: '操作Chrome库' }
{ name: 'electron', info: '操作Electron窗体相关API' }
{ name: 'dataDb', info: '操作本地JSON数据存储, 用于本地存储数据' }
{ name: 'chromePath', info: '本地Chrome安装路径' }
```

#### 3.打包问题说明

**解决静态资源打包后无法加载问题**

* https://juejin.cn/post/7205122038319202363
* https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/configuration.html#typescript-options

在`vue.config.js`添加配置
```js
// vue.config.js
module.exports = {
  pluginOptions: {
    electronBuilder: {
      // If you want to use the file:// protocol, add win.loadURL(`file://${__dirname}/index.html`) to your main process file
      // In place of win.loadURL('app://./index.html'), and set customFileProtocol to './'
      customFileProtocol: './'
    }
  }
}
// src/background.js
// ...
win.loadURL('app://./index.html') // Change it here as well
// ...
```

**比较优雅的解决打包后vm2中缺失运行依赖问题**
* https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/598
* https://www.electron.build/configuration/contents.html#extrafiles
* https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/guide.html#native-modules

在`vue.config.js`添加配置
```js
module.exports = {
  ...
  configureWebpack: {
    // 打包时包含,虽然可以启动,但是功能错误
    externals: {
      vm2: 'require("vm2")',
      mysql2: 'require("mysql2")',
      'puppeteer-core': 'require("puppeteer-core")',
    },
  },
  ...
  pluginOptions: {
    electronBuilder: {
      preload: 'src/preload.js',
      // 设置最后的静态资源路径 https://nklayman.github.io/vue-cli-plugin-electron-builder/guide/configuration.html#typescript-options
      // customFileProtocol: 'app://./', // Make sure to add "./" to the end of the protocol
      // If you want to use the file:// protocol, add win.loadURL(`file://${__dirname}/index.html`) to your main process file
      // In place of win.loadURL('app://./index.html'), and set customFileProtocol to './'
      customFileProtocol: './',
      nodeIntegration: true, // render进程中可以使用node
      // 需要依赖的外部模块列表，一个是webpack中需要排除，一个是electron-builder中需要排除
      externals: ['puppeteer-core', 'mysql2', 'vm2'],
      // If you are using Yarn Workspaces, you may have multiple node_modules folders
      // List them all here so that VCP Electron Builder can find them
      nodeModulesPath: ['../../node_modules', './node_modules'],
      builderOptions: {
        extraResources: [
          // 将vm2中引用到的第三方库打包出来
          {
            from: 'node_modules',
            to: '../node_modules',
            // 方式一：一个一个找，被依赖的模块
            filter: [
              'agent-base/**',
              'balanced-match/**',
              'brace-expansion/**',
              'buffer-crc32/**',
              'concat-map/**',
              'debug/**',
              'end-of-stream/**',
              'electron/**',
              '!electron/dist/**',
              'fd-slicer/**',
              'find-up/**',
              'fs.realpath/**',
              'glob/**',
              'https-proxy-agent/**',
              'inflight/**',
              'inherits/**',
              'locate-path/**',
              'minimatch/**',
              'moment/**',
              'ms/**',
              'once/**',
              'p-limit/**',
              'p-locate/**',
              'p-try/**',
              'path-exists/**',
              'path-is-absolute/**',
              'pend/**',
              'pkg-dir/**',
              'proxy-from-env/**',
              'pump/**',
              'puppeteer-core/**',
              'rimraf/**',
              'wrappy/**',
              'ws/**',
              'xlsx/**',
              'yauzl/**',
              // '!**/dist/**',
            ],
            // 方式二：排除不要的依赖（还是太多了）
            // filter: [
            //   '**/*',
            //   '!.bin/**',
            //   '!.cache/**',
            //   '!@*/**',
            //   '!css*/**',
            //   '!core*/**',
            //   '!babel*/**',
            //   '!dom*/**',
            //   '!electron*/**',
            //   '!es6*/**',
            //   '!eslint*/**',
            //   '!lodash*/**',
            //   '!node*/**',
            //   '!postcss*/**',
            //   '!vue*/**',
            //   '!webpack*/**',
            // ],
          },
        ],
        asar: true,
      },
    },
  },
}
```

**这个可以不用参考了，留作记录：在vue.config.js中被externals的几个包，在electron打包后会丢失依赖导致无法运行**

* vm2
* mysql2
* puppeteer-core

经过大量尝试，发现必须把`node_modules`的资源排除，然后编译 `yarn build`
```js
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        extraResources: ['src', 'node_modules'],
      }
    }
  }
```

打包后的目录结构输出如下：
```yaml
工程目录:
  src: # 源码根目录
    ...
  node_modules: # 工程的依赖
    ...
  dist_electron: # 打包输出目录
    win-unpacked: # 可执行程序输出目录
      - 爬虫工具.exe # 可执行程序入口
```

这时候，进入目录直接执行`win-unpacked/爬虫工具.exe`，发现能正常使用。
但是，有意思的来了，把`win-unpacked`整个目录移动到其他文件夹下，如`D:/newFolder`，
会发现执行`win-unpacked/爬虫工具.exe`后`puppeteer-core`相关依赖报错。
最终发现，打包出来的执行程序，会依赖`src`同级下的`node_modules`，**非常离谱！**

这时候尝试把`node_modules`、`win-unpacked`一起迁出，程序加载正常，
又尝试把`node_modules`放进`win-unpacked`内部，程序也加载正常！
这时候我猜测`爬虫工具.exe`必须和`node_modules`目录作为同级/父级的存在，才能顺利加载。

因此最终的解决方案是这样的：（非常不优雅的解决方案）
```yaml
工程目录:
  src: # 源码根目录
    ...
  node_modules: # 工程的依赖
    ...
  dist_electron: # 打包输出目录
    win-unpacked: # 可执行程序输出目录
      - node_modules: # 工程的依赖-副本1
      - resources: # 打包后的资源目录
        - node_modules: # 工程的依赖-副本2
        ...
      - 爬虫工具.exe # 可执行程序入口
```

需要两份冗余的node_modules依赖，对应的配置：
```js
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        extraResources: [
          'node_modules',
          {
            from: 'node_modules',
            to: '../node_modules',
          },
        ],
      }
    }
  }
```


### 运行截图
![](./imgs/1.jpg)
![](./imgs/7.jpg)
![](./imgs/2.jpg)
![](./imgs/3.jpg)
![](./imgs/4.jpg)
![](./imgs/5.jpg)
![](./imgs/6.jpg)
![](./imgs/8.jpg)
