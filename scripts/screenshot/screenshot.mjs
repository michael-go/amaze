import puppeteer from 'puppeteer'

const outFile = process.argv[2] || '/tmp/amaze_screenshot.png'
const crop = process.argv[3] // optional: "x,y,w,h"

const browser = await puppeteer.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle'] })
const page = await browser.newPage()
await page.setViewport({ width: 900, height: 700 })
await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' })
await new Promise(r => setTimeout(r, 1500))

// Click Start Game
await page.click('button')
await new Promise(r => setTimeout(r, 1500))

// Press Space to skip countdown (shows top-down memorize view, Space skips to playing)
await page.keyboard.press('Space')
await new Promise(r => setTimeout(r, 2500))

const opts = { path: outFile }
if (crop) {
  const [x, y, w, h] = crop.split(',').map(Number)
  opts.clip = { x, y, width: w, height: h }
}
await page.screenshot(opts)
await browser.close()
console.log(`Screenshot saved to ${outFile}`)
