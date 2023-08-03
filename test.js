const puppeteer = require('puppeteer-core')
// const { dialog } = require('electron')
const XLSX = require('xlsx')
const fs = require('fs')
const moment = require('moment')
const path = require('path')

let 水库名称 = '泽雅水库'
let 水库代码 = '70508440'
let 天数 = 1
let url = `https://sqfb.zjsq.net.cn:8089/nuxtsyq/new/MarkInfo?zh=${水库代码}&zm=${encodeURIComponent(水库名称)}&day=${天数}`
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

  // console.log('page', page)

  await page.goto(url)

  console.log('goto')

  // 自定义函数无法传递，需要转换成字符串，然后绑定到页面上下文
  const formateDate = (strDate) => {
    console.log('strDate', strDate)
    return !strDate || moment(strDate, 'MM-DD HH:mm').format('YYYY-MM-DD HH:mm')
  }

  // 注入时间库
  const librarySource = fs.readFileSync(
    path.resolve('node_modules/moment/min/moment.min.js'),
    'utf8'
  )
  await page.evaluate(librarySource)

  // 现在你可以在 page.$eval 或 page.$$eval 中使用 moment 库了
  const result = await page.evaluate(() => {
    return moment().format('YYYY-MM-DD-HH-mm')
  })
  console.log('当前日期和时间', result)

  // const tbody = await page.$eval('tbody', (a) => a.innerHTML)
  // console.log('tbody', tbody)

  // 在Puppeteer的$eval和$$eval方法中，你不能直接访问外部作用域的函数或变量，因为这些方法在页面的上下文中执行JavaScript，这是一个与Node.js代码隔离的环境
  const data = await page.$$eval(
    'tbody>.el-table__row',
    (rows, funcStr) => {
      const func = new Function(`return ${funcStr}`)()
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
              dataObj['时间'] = func(td.querySelector('div').innerText)
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
    },
    formateDate.toString() // 绑定自定义函数
  )

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

  console.log('合并后的数据', mergedData)

  await browser.close()

  // 导出数据
  const ws = XLSX.utils.json_to_sheet(mergedData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${水库名称}-${水库代码}-${result}.xlsx`)

  // dialog
  //   .showSaveDialog({
  //     filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  //   })
  //   .then((result) => {
  //     if (!result.canceled) {
  //       XLSX.writeFile(wb, result.filePath)
  //     }
  //   })
  //   .catch((err) => {
  //     console.log(err)
  //   })
}

spider()
