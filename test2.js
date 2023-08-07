/*eslint-disable*/
const puppeteer = require('puppeteer-core')
const XLSX = require('xlsx')
const moment = require('moment')
// const fs = require('fs')
// const cheerio = require('cheerio')
const path = require('path')
const os = require('os')

let 水库名称 = '珊溪水库'
let 水库代码 = '70600500'
let 天数 = 7
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

  console.log('页面加载完成')

  // 使用 moment 库
  const result = moment().format('DD/MM/YYYY HH:mm:ss')
  console.log(result)
  console.log('当前日期和时间')

  // 分析dom table
  let data = await page.$$eval('tbody>.el-table__row', (rows) => {
    return rows.map((row) => {
      const columns = Array.from(row.querySelectorAll('.el-table__cell'))
      const dataObj = {}
      for (let i = 0; i < columns.length; i++) {
        const td = columns[i]
        // 填充数据
        switch (i) {
          case 0:
            // dataObj['序号'] = td.querySelector('div>div').innerText
            // dataObj['序号'] = dataObj['序号'].trim() === '-' ? null : dataObj['序号']
            break
          case 1:
            // 时间
            dataObj['record_time'] = td.querySelector('div').innerText
            break
          case 2:
            // 雨量
            dataObj['rainfall'] = td.querySelector('div').innerText
            dataObj['rainfall'] = dataObj['rainfall'].trim() === '-' ? null : dataObj['rainfall']
            break
          case 3:
            // 水位
            dataObj['waterlevel'] = td.querySelector('div>span').innerText
            dataObj['waterlevel'] = dataObj['waterlevel'].trim() === '-' ? null : dataObj['waterlevel']
            break
          case 4:
            // 库容
            dataObj['capacity'] = td.querySelector('div>span').innerText
            dataObj['capacity'] = dataObj['capacity'].trim() === '-' ? null : dataObj['capacity']
            break
          case 5:
            // 人工入库流量
            dataObj['manual_inbound'] = td.querySelector('div>span').innerText
            dataObj['manual_inbound'] = dataObj['manual_inbound'].trim() === '-' ? null : dataObj['manual_inbound']
            break
          case 6:
            // 人工出库流量
            dataObj['manual_outbound'] = td.querySelector('div>span').innerText
            dataObj['manual_outbound'] = dataObj['manual_outbound'].trim() === '-' ? null : dataObj['manual_outbound']
            break
          default:
            break
        }
      }
      return dataObj
    })
  })

  console.log(data.length)
  console.log('爬取完成，包括冗余行数量')

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

  // 合并两个数组数据
  const mergedData = firstHalf.map((item, index) => {
    const filteredFirst = filterEmptyKeys(item)
    const filteredSecond = filterEmptyKeys(secondHalf[index])
    return { 
      ...filteredFirst,
      ...filteredSecond,
      // 固定数据
      name: 水库名称,
      code: 水库代码,
      update_by: 'admin',
      update_time: result,
    }
  })
  // 过滤掉无效数据
  .filter(item => item['水位'] !== null && item['库容'] !== null && item['雨量'] !== null)

  await browser.close()

  // 格式化数据的时间
  mergedData.forEach((item) => {
    item['record_time'] =
      item['record_time'] &&
      moment(item['record_time'], 'MM-DD HH:mm').format('DD/MM/YYYY HH:mm:ss')
  })

  // console.log(mergedData)
  console.log('处理数据完成')

  // 导出数据
  const ws = XLSX.utils.json_to_sheet(mergedData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  // 保存桌面
  const homedir = os.homedir();
  const desktopPath = 'desktop'
  const fileName = `${水库名称}-${水库代码}-${moment().format('YYYY-MM-DD-HHmmss')}.xlsx`
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