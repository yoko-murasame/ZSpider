const puppeteer = require('puppeteer-core')
const XLSX = require('xlsx')
const moment = require('moment')
// const fs = require('fs')
// const cheerio = require('cheerio')
const path = require('path')
const os = require('os')

let 水库名称 = '珊溪水库'
let 水库代码 = '70600500'
let 天数 = 1
let url = `https://sqfb.zjsq.net.cn:8089/nuxtsyq/new/MarkInfo?zh=${水库代码}&zm=${encodeURIComponent(
  水库名称
)}&day=${天数}`
// let url ='https://sqfb.zjsq.net.cn:8089/nuxtsyq/new/MarkInfo?zh=70508440&zm=%E6%B3%BD%E9%9B%85%E6%B0%B4%E5%BA%93&day=1'
let chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

let browser, page
async function spider() {
  browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: [
      // 禁用一些功能
      '--no-sandbox', // 沙盒模式
      '--disable-setuid-sandbox', // uid沙盒
      '--disable-dev-shm-usage', // 创建临时文件共享内存
      '--disable-accelerated-2d-canvas', // canvas渲染
      '--disable-gpu', // GPU硬件加速
    ],
    ignoreDefaultArgs: ['--enable-automation'],
  })

  page = await browser.newPage()

  await page.goto(url)

  console.log('goto')

  // 现在你可以在 page.$eval 或 page.$$eval 中使用 moment 库了
  const result = moment().format('YYYY-MM-DD HH-mm-ss')
  console.log('当前日期和时间', result)

  // 分析dom table
  let data = await page.$$eval('tbody>.el-table__row', (rows) => {
    return rows.map((row) => {
      const columns = Array.from(row.querySelectorAll('.el-table__cell'))
      const dataObj = {}
      for (let i = 0; i < columns.length; i++) {
        const td = columns[i]
        switch (i) {
          case 0:
            dataObj['序号'] = td.querySelector('div>div').innerText
            break
          case 1:
            dataObj['时间'] = td.querySelector('div').innerText
            break
          case 2:
            dataObj['雨量'] = td.querySelector('div').innerText
            break
          case 3:
            dataObj['水位'] = td.querySelector('div>span').innerText
            break
          case 4:
            dataObj['库容'] = td.querySelector('div>span').innerText
            break
          case 5:
            dataObj['人工出库流量'] = td.querySelector('div>span').innerText
            break
          case 6:
            dataObj['人工入库流量'] = td.querySelector('div>span').innerText
            break
          default:
            break
        }
      }
      return dataObj
    })
  })

  console.log('包括冗余行数量', data.length)
  // console.log('data', data)

  // 合并数据
  const half = data.length / 2
  const firstHalf = data.slice(0, half)
  const secondHalf = data.slice(half)

  const filterEmptyKeys = (obj) => {
    const filteredObj = {}
    for (const key in obj) {
      if (obj[key] !== null && obj[key] !== '') {
        filteredObj[key] = obj[key]
      }
    }
    return filteredObj
  }

  const mergedData = firstHalf.map((item, index) => {
    const filteredFirst = filterEmptyKeys(item)
    const filteredSecond = filterEmptyKeys(secondHalf[index])
    return { ...filteredFirst, ...filteredSecond }
  })

  await browser.close()

  // 格式化数据的时间
  mergedData.forEach((item) => {
    item['时间'] =
      item['时间'] &&
      moment(item['时间'], 'MM-DD HH:mm').format('YYYY-MM-DD HH:mm:ss')
  })

  console.log('合并后的数据', mergedData)

  // 导出数据
  const ws = XLSX.utils.json_to_sheet(mergedData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  // 保存桌面
  const homedir = os.homedir();
  const desktopPath = 'desktop'
  const fileName = `${水库名称}-${水库代码}-${result}.xlsx`
  const filePath = path.join(homedir, desktopPath, fileName)
  console.log(filePath)
  XLSX.writeFile(wb, filePath)

  // 通过对话框让用户选择导出目录和文件名
  // const path = ipcRenderer.sendSync('showSaveJsonDialog')
  // console.log('保存目录')
  // console.log(path)
  // dialog
  //   .showSaveDialog({
  //     defaultPath: `${水库名称}-${水库代码}-${result}.xlsx`,
  //   })
  //   .then((result) => {
  //     if (!result.canceled && result.filePath) {
  //       const filePath = result.filePath
  //       // const ws = XLSX.utils.json_to_sheet(mergedData)
  //       // const wb = XLSX.utils.book_new()
  //       // XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  //       // 将工作簿写入指定的文件路径
  //       XLSX.writeFile(wb, filePath)
  //     }
  //   })
  //   .catch((err) => {
  //     console.error(err)
  //   })
}

spider()

// 路径测试
// const { remote } = require('electron')
// const desktopPath = remote.app.getPath('desktop')
// console.log(desktopPath)
// const fileName = `aaa.xlsx`
// console.log(fileName)
// const path = require('path')
// const filePath = path.join('aaa', fileName)
// console.log(filePath)
// const os = require('os');
// const homedir = os.homedir();
// console.log(homedir)
// const moment = require('moment')
// const now = moment().format('YYYY-MM-DD HH-mm-ss')
// console.log(now)
// return