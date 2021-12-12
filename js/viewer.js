(function (window, document) {
  const baseUrl = 'https://raw.githubusercontent.com/venice1200'
  const hexPattern = /0x[0-9A-F]{2}/gi
  const bitPattern = /"[01]+"/g
  const imageTypes = {
    gsc: {
      size: [256, 64],
      func: putGscImageData,
      pattern: hexPattern,
      url: `${baseUrl}/MiSTer_tty2oled_Pictures/main/Pictures`
    },
    pix: {
      size: [128, 64],
      func: putPixImageData,
      pattern: bitPattern,
      url: `${baseUrl}/MiSTer_i2c2oled_Pictures/main/Pictures`
    },
    xbm: {
      size: [256, 64],
      func: putXbmImageData,
      pattern: hexPattern,
      url: `${baseUrl}/MiSTer_tty2oled_Pictures/main/Pictures`
    }
  }
  const oledColors = {
    Green: [0, 255, 0],
    Blue: [0, 255, 255],
    Yellow: [255, 255, 0],
    White: [255, 255, 255]
  }

  // State
  let currentColor = 'Green'

  // Cores
  function fetchPic (fileType, path, core) {
    const url = `${imageTypes[fileType].url}/${path}/${core}`
    return fetch(url).then((response) => {
      return response.text().then((text) => {
        return text.match(imageTypes[fileType].pattern)
      })
    })
  }

  function putGscImageData (imageData, gscData) {
    const [r, g, b] = oledColors[currentColor]
    // some GSC files were generated with extra data, grab just the last 8192 bytes
    const data = gscData.length > 8192 ? gscData.slice(-8192) : gscData
    for (let i = 0; i < imageData.data.length; i += 8) {
      const twoPixel = data[i / 8]
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

  function putPixImageData (imageData, pixData) {
    const data = []
    pixData.forEach(line => {
      for (let j = 0; j < line.length; j++) {
        const pixel = line[j]
        if (pixel === '"') {
          continue
        }
        data.push(parseInt(pixel))
      }
    })
    for (let i = 0; i < imageData.data.length; i += 4) {
      const pixel = data[i / 4]
      // first 16 rows (128x16x4) are yellow, rest is blue
      const [r, g, b] = i < 8192 ? oledColors.Yellow : oledColors.Blue
      if (pixel === 1) {
        imageData.data[i + 0] = r
        imageData.data[i + 1] = g
        imageData.data[i + 2] = b
        imageData.data[i + 3] = 255
      }
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

  function draw (canvas, fileType, data) {
    const ctx = canvas.getContext('2d')
    const [width, height] = imageTypes[fileType].size
    canvas.width = width
    canvas.height = height
    const imageData = ctx.createImageData(canvas.width, canvas.height)
    imageTypes[fileType].func(imageData, data)
    ctx.putImageData(imageData, 0, 0)
  }

  function drawPic (canvas, path, file) {
    const fileType = file.split('.').pop()
    return fetchPic(fileType, path, file).then(data => {
      draw(canvas, fileType, data)
    })
  }

  function setMenuClass (parentId, comparator, selector = '.pure-menu-item', toggleClass = 'pure-menu-selected') {
    const parent = document.getElementById(parentId)
    const children = parent.querySelectorAll(selector)
    children.forEach((child) => {
      const classes = child.className?.split(' ').filter(item => item !== toggleClass)
      if (comparator(child)) {
        classes.push(toggleClass)
      }
      child.className = classes.join(' ')
    })
  }

  function setColor (newColor) {
    currentColor = newColor
    const comparator = node => node.innerText.toUpperCase() === newColor.toUpperCase()
    setMenuClass('oled-colors', comparator)

    // Redraw Grid
    const grid = document.getElementById('grid')
    grid.querySelectorAll('canvas').forEach((item) => {
      const file = item.getAttribute('id')
      const path = item.getAttribute('data-path')
      drawPic(item, path, file)
    })
  }

  function clearGrid () {
    const grid = document.getElementById('grid')
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild)
    }
  }

  function drawGrid (kind, path, cores, fixedColor = false) {
    // set the selected menu item
    const comparator = node => {
      const text = node.innerText.match(/(.*)(?:\s+\([\d]+\))/m)[1]
      return text.toUpperCase() === path.toUpperCase()
    }
    setMenuClass('pictures', comparator)
    // enable/disable oled color selection
    setMenuClass('oled-colors', () => fixedColor, '.pure-menu-item', 'pure-menu-disabled')
    document.getElementById('pic-type').innerText = `${kind}2oled Pictures`
    document.getElementById('pic-path').innerText = path
    // Clear and redraw the grid
    clearGrid()
    const grid = document.getElementById('grid')
    cores.forEach(core => {
      const canvas = document.createElement('canvas')
      canvas.title = core.split('.').slice(0, -1).join('.')
      canvas.setAttribute('id', core)
      canvas.setAttribute('data-path', path)
      canvas.className = 'grid-item'
      drawPic(canvas, path, core).then(() => {
        grid.appendChild(canvas)
      }).catch((e) => {
        console.log(`could not draw ${core}`, e)
      })
    })
  }

  function setVersion (kind, versionInfo) {
    const parent = document.getElementById(`${kind}-version`)
    const date = parent.querySelector('#version-date')
    console.log(parent, date)
    try {
      date.innerHTML = new Date(versionInfo.date).toDateString()
    } catch (e) {
      console.log('could not parse date:', e)
      date.innerText = versionInfo.date
    }
    const sha = parent.querySelector('#version-sha')
    sha.innerText = versionInfo.sha
  }

  function pictureMenuItem (parent, kind, path, cores, fixedColor) {
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
    a.onclick = () => drawGrid(kind, path, sortedCores, fixedColor)
    parent.append(li)
  }

  function populateColorsMenu () {
    const colorButtons = document.getElementById('oled-colors')
    for (const k of Object.keys(oledColors)) {
      const li = document.createElement('li')
      li.className = 'pure-menu-item'
      if (currentColor === k) {
        li.className += ' pure-menu-selected'
      }
      const a = document.createElement('a')
      a.href = '#'
      a.className = 'pure-menu-link'
      a.innerText = k
      const span = document.createElement('span')
      span.className = `oled-${k.toLowerCase()}`
      a.prepend(span)
      li.append(a)
      a.onclick = () => setColor(k)
      colorButtons.append(li)
    }
  }

  function populatePictureMenu () {
    const picData = [
      ['tty', 'data_pics.json', false],
      ['i2c', 'https://venice1200.github.io/MiSTer_i2c2oled_Pictures/data_i2c_pix.json', true]
    ]
    picData.forEach(([kind, url, fixedColor]) => {
      const menuParent = document.getElementById(`${kind}-pictures`)
      fetch(url).then((response) => {
        response.json().then(data => {
          setVersion(kind, data.version)
          for (const [path, cores] of Object.entries(data.pictures).sort()) {
            pictureMenuItem(menuParent, kind, path, cores, fixedColor)
          }
        })
      })
    })
  }

  function init () {
    populateColorsMenu()
    populatePictureMenu()
  }

  init()
}(this, this.document))
