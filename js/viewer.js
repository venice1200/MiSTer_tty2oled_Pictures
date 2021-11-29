(function (window, document) {
  const hexPattern = /0x[0-9A-F]{2}/gi

  const oledWidth = 256
  const oledHeight = 64
  const oledColors = {
    Green: [0, 255, 0],
    Blue: [0, 255, 255],
    Yellow: [255, 255, 0],
    White: [255, 255, 255]
  }

  // State
  let currentColor = 'Green'

  // Cores
  function fetchPic (path, core) {
    const url = `https://raw.githubusercontent.com/venice1200/MiSTer_tty2oled_Pictures/main/Pictures/${path}/${core}`
    return fetch(url).then((response) => {
      return response.text().then((text) => {
        return text.match(hexPattern)
      })
    })
  }

  function putGscImageData (imageData, gscData) {
    const [r, g, b] = oledColors[currentColor]
    for (let i = 0; i < imageData.data.length; i += 8) {
      const twoPixel = gscData[i / 8]
      const high = (twoPixel & 0xF) + 1
      const low = (twoPixel >> 4) + 1

      // Pixel 1
      imageData.data[i + 0] = r // R value
      imageData.data[i + 1] = g // G value
      imageData.data[i + 2] = b // B value
      imageData.data[i + 3] = low * 16 // A value
      // Pixel 2
      imageData.data[i + 4] = r // R value
      imageData.data[i + 5] = g // G value
      imageData.data[i + 6] = b // B value
      imageData.data[i + 7] = high * 16 // A value
    }
  }

  function putXbmImageData (imageData, xbmData) {
    const [r, g, b] = oledColors[currentColor]
    const data = []
    xbmData.forEach(eightPixel => {
      for (let j = 0; j < 8; j++) {
        data.push(eightPixel >> j & 1)
      }
    })
    for (let i = 0; i < imageData.data.length; i += 4) {
      const pixel = data[i / 4]
      if (pixel === 1) {
        imageData.data[i + 0] = r
        imageData.data[i + 1] = g
        imageData.data[i + 2] = b
        imageData.data[i + 3] = 255
      }
    }
  }

  function draw (canvas, file, data) {
    const ctx = canvas.getContext('2d')
    canvas.width = oledWidth
    canvas.height = oledHeight
    const imageData = ctx.createImageData(oledWidth, oledHeight)
    if (file.endsWith('.gsc')) {
      putGscImageData(imageData, data)
    } else {
      putXbmImageData(imageData, data)
    }
    ctx.putImageData(imageData, 0, 0)
  }

  function drawPic (canvas, path, file) {
    fetchPic(path, file).then(data => {
      draw(canvas, file, data)
    })
  }

  function setColor (newColor) {
    currentColor = newColor

    // Redraw Grid
    const grid = document.getElementById('grid')
    const children = grid.childNodes
    children.forEach((item) => {
      const file = item.getAttribute('id')
      const path = item.getAttribute('path')
      drawPic(item, path, file)
    })
  }

  function clearGrid () {
    const grid = document.getElementById('grid')
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild)
    }
  }

  function drawGrid (path, cores) {
    const header = document.getElementById('pic-type')
    header.innerText = path
    // Clear and redraw the grid
    clearGrid()
    const grid = document.getElementById('grid')
    cores.forEach(core => {
      const canvas = document.createElement('canvas')
      canvas.title = core.split('.').slice(0, -1).join('.')
      canvas.setAttribute('id', core)
      canvas.setAttribute('path', path)
      canvas.className = 'grid-item'
      drawPic(canvas, path, core)
      grid.appendChild(canvas)
    })
  }

  function setVersion (versionInfo) {
    const date = document.getElementById('version-date')
    date.innerText = versionInfo.date
    const sha = document.getElementById('version-sha')
    sha.innerText = versionInfo.sha
  }

  function init () {
    // OLED Color Buttons
    const colorButtons = document.getElementById('oled-colors')
    for (const k of Object.keys(oledColors)) {
      const li = document.createElement('li')
      li.className = 'pure-menu-item'
      const a = document.createElement('a')
      a.href = '#'
      a.className = 'pure-menu-link'
      a.innerText = k.toUpperCase()
      const span = document.createElement('span')
      span.className = `oled-${k.toLowerCase()}`
      a.prepend(span)
      li.append(a)
      a.onclick = () => setColor(k)
      colorButtons.append(li)
    }

    // Fetch Data Json
    const picButtons = document.getElementById('pictures')
    fetch('data_pics.json').then((response) => {
      response.json().then(data => {
        setVersion(data.version)
        for (const [path, cores] of Object.entries(data.pictures).sort()) {
          const sortedCores = cores.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
          const li = document.createElement('li')
          li.className = 'pure-menu-item'
          const a = document.createElement('a')
          a.href = '#'
          a.className = 'pure-menu-link'
          a.innerText = path
          const span = document.createElement('span')
          span.className = 'pic-count'
          span.innerText = ` (${cores.length})`
          a.append(span)
          li.append(a)
          a.onclick = () => drawGrid(path, sortedCores)
          picButtons.append(li)
        }
      })
    })
  }

  init()
}(this, this.document))
