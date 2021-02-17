const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')
const { typeSections, operatorSections, guideSections } = require('./constants')
const pMap = require('p-map')

;(async () => {
  const browser = await puppeteer.launch({
    headless: true
  })

  const page = await browser.newPage()
  page.on('response', async (response) => {
    const url = response.url()

    if (
      !url.startsWith(
        'https://json-schema.org/understanding-json-schema/_static/'
      )
    ) {
      return
    }

    const contents = await response.text()
    const filePath = path.join(
      __dirname,
      '../json-schema.docset/Contents/Resources/Documents',
      url.replace('https://json-schema.org/understanding-json-schema/', '')
    )
    const dirname = path.dirname(filePath)

    mkdirp.sync(dirname)
    fs.writeFileSync(filePath, contents)
  })

  await pMap(
    [...typeSections, ...operatorSections, ...guideSections],
    async ([title, name, dir]) => {
      const url = `https://json-schema.org/understanding-json-schema/${dir === '' ? '' : `${dir}/`}/${name}.html`
      await page.goto(url, { waitUntil: 'networkidle0' })

      await page.addStyleTag({content: `
:root:root body {
  padding: 1em;
  line-height: 1.6;
}
      `})
      await overwriteTitle(page, title)
      await removeElements(page)
      await modifyHeadings(page)

      const html = await page.content()
      fs.writeFileSync(
        path.join(
          __dirname,
          `../json-schema.docset/Contents/Resources/Documents/${dir === '' ? '' : `${dir}/`}${name}.html`
        ),
        html
      )
    },
    { concurrency: 1 }
  )

  await browser.close()
})()

/**
 *
 * @param {import('puppeteer').Page} page
 * @param {string} title - the title of page
 * @returns {Promise<void>}
 */
async function overwriteTitle(page, title) {
  await page.evaluate((title) => {
    document.title = title
  }, title)
}

/**
 *
 * @param {import('puppeteer').Page} page
 * @returns {Promise<void>}
 */
async function removeElements(page) {
  await page.evaluate(() => {
    const selectors = ['.visible-desktop', '#navbar', '#contents', '.tabbable']

    selectors.forEach((selector) => {
      Array.from(document.querySelectorAll(selector)).forEach(
        (element) => {
          element.parentElement.removeChild(element)
        }
      )
    })
  })
}

/**
 *
 * @param {import('puppeteer').Page} page
 * @returns {Promise<void>}
 */
async function modifyHeadings(page) {
  await page.evaluate(() => {
    const headerlinkSelector = '.headerlink'
    Array.from(document.querySelectorAll(headerlinkSelector)).forEach((element) => {
      element.parentElement.removeChild(element)
    })

    const selector = 'h1, h2, h3, h4, h5, h6'

    Array.from(document.querySelectorAll(selector)).forEach((heading) => {
      const a = document.createElement('a')
      a.setAttribute('name', `//apple_ref/cpp/Section/${heading.textContent}`)
      a.className = 'dashAnchor'
      a.style.cssText = 'color:inherit;text-decoration:none;'
      const h = document.createElement(heading.tagName.toLowerCase())
      h.textContent = heading.textContent
      a.appendChild(h)

      heading.parentElement.insertBefore(a, heading)
      heading.parentElement.removeChild(heading)
    })
  })
}
