/*eslint-disable*/
const puppeteer = require('puppeteer-core')
const XLSX = require('xlsx')
const moment = require('moment')
// const fs = require('fs')
// const cheerio = require('cheerio')
const path = require('path')
const os = require('os')

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

  let 收集区域 = ['鹿城区', '龙湾区', '瓯海区', '洞头区', '永嘉县', '平阳县', '苍南县', '文成县', '泰顺县', '瑞安市', '乐清市', '龙港市']
  let 查询天数 = 2

  let xlsDatas = 收集区域.map(区域 => ({ '县（区、市）': 区域 }))

  for (let i = 查询天数 - 1; i >= 0; i--) {
    let 实际日期 = moment().subtract(i, 'days')
    let 日期字符串 = 实际日期.format('YYYY-MM-DD')
    let 最早时刻 = 实际日期.startOf('day').format('YYYY-MM-DDTHH:mm:ss')
    let 最后时刻 = 实际日期.endOf('day').format('YYYY-MM-DDTHH:mm:ss')
    console.log(`日期：${日期字符串}，最早时刻：${最早时刻}，最后时刻：${最后时刻}`)
    // 雨量nuxt地址：https://sqfb.jhhk.zjsw.cn:8089/nuxtsyq/new/realtimeRain?areaFlag=1&sss=温州市&ssx&st=2023-12-17T00:00:00&et=2023-12-17T23:59:59&ly&max&min=0&bool=false&bxdj=1,2,3,4,5,&zm&type=0&lx=QX,ME,SX,DS&progress=false
    let rainfallUrl = `https://sqfb.jhhk.zjsw.cn:8089/nuxtsyq/new/realtimeRain?areaFlag=1&sss=温州市&ssx&st=${最早时刻}&et=${最后时刻}&ly&max&min=0&bool=false&bxdj=1,2,3,4,5,&zm&type=0&lx=QX,ME,SX,DS&progress=false`
    console.log(`日期：${日期字符串}，地址：${rainfallUrl}`)
    // 打开页面
    await page.goto(rainfallUrl)
    console.log(`日期：${日期字符串}，页面打开`)
    // 点击分区统计
    await page.click('div.tab > div:nth-child(2)')
    // await page.waitForTimeout(2000); // 这个延时会在vm环境中执行失败
    console.log(`日期：${日期字符串}，页面加载完成`)

    // 分析dom table
    let data = await page.$$eval('div.el-table__fixed-body-wrapper > table > tbody > tr',
      (rows, 日期字符串, 收集区域, xlsDatas) => {
        return rows.map((row) => {
          const columns = Array.from(row.querySelectorAll('td'))
          const dataObj = {}
          let targetObj = null
          for (let i = 0; i < columns.length; i++) {
            const td = columns[i]
            // 填充数据
            switch (i) {
              case 0:
                // 区域
                const 区域 = td.querySelector('.cell.el-tooltip').textContent
                if (!收集区域.includes(区域)) {
                  return
                }
                // dataObj['县（区、市）'] = 区域
                targetObj = xlsDatas.find(item => item['县（区、市）'] === 区域)
                break
              case 1:
                // 降水量
                // dataObj[今天字符串] = td.querySelector('div').textContent
                if (targetObj) {
                  targetObj[日期字符串] = td.querySelector('div').textContent
                }
                break
              default:
                break
            }
          }
          return targetObj
        })
      }, 日期字符串, 收集区域, xlsDatas)

    // 去除空行
    data = data.filter(item => item)
    xlsDatas = data
    console.log(xlsDatas)
    console.log(`日期：${日期字符串}，爬取完成`)
  }

  await browser.close()

  console.log('处理数据完成，导出Execl。')

  // 导出数据
  const ws = XLSX.utils.json_to_sheet(xlsDatas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  // 保存桌面
  const homedir = os.homedir();
  const desktopPath = 'desktop'
  const fileName = `降水量数据-截至${moment().format('YYYY-MM-DD-HHmmss')}-共${查询天数}天.xlsx`
  const filePath = path.join(homedir, desktopPath, fileName)
  console.log(filePath)
  XLSX.writeFile(wb, filePath)

}

spider()
