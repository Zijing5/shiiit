const {
  loadRecords,
  getRecordById,
  getRecordsByDate,
  updateRecordById
} = require('../../utils/records')
const { getShitImageUrl, getMiniprogramQrUrl, MINIPROGRAM_QR_PATH, IMAGE_CDN_BASE } = require('../../config/images')

const SLOGANS = [
  '闺蜜，今天你拉屎了吗？',
  '祝您大便永远通畅！'
]

// 形状 -> 匹配文案 a
const SHAPE_TEXTS = {
  '完美': '拉出了完美的便便',
  '偏硬': '拉出了硬硬的便便',
  '偏软': '拉出了软软的便便',
  '稀': '拉稀了...'
}
// 份量 -> 匹配文案 b
const AMOUNT_TEXTS = {
  '少': '份量不多',
  '中': '份量不多不少刚刚好',
  '多': '份量很多',
  '超级无敌爆炸多': '份量超级无敌爆炸多'
}

// 形状 -> 屎图候选列表（从对应列表随机选一张），图片在主目录或 images/
const SHAPE_IMAGES = {
  '完美': ['shit4', 'shit5', 'shit6', 'shit12'],
  '偏硬': ['shit11', 'shit10', 'shit3', 'shit16','shit2','shit8','shit9'],
  '偏软': ['shit13', 'shit11', 'shit10', 'shit9','shit3','shit8','shit9'],
  '稀': ['shit16', 'shit14', 'shit8', 'shit7','shit2','shit1','shit1','shit2']
}

// 「拉不出来」候选图列表（从中随机选一张）
const CONSTIPATION_IMAGES = ['shit1', 'shit2','shit7','shit8','shit16']

const W = 375
const H = 500

function decodeQueryValue(value) {
  if (value == null) return ''
  const str = String(value)
  try {
    return decodeURIComponent(str)
  } catch (e) {
    return str
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5)
  ctx.arc(x + w - r, y + r, r, Math.PI * 1.5, Math.PI * 2)
  ctx.arc(x + w - r, y + h - r, r, 0, Math.PI * 0.5)
  ctx.arc(x + r, y + h - r, r, Math.PI * 0.5, Math.PI)
  ctx.closePath()
}

Page({
  data: {
    record: null,
    sharePopupVisible: false,
    shareLoading: false,
    shareImageReady: false,
    shareImagePath: '',
    slogan: '',
    canvasW: 375,
    canvasH: 500
  },

  onLoad(options) {
    // 以「分享打卡图片」弹层内容区宽度为基准，保证生成的分享图不越出弹层
    const sys = wx.getSystemInfoSync()
    const w = sys.windowWidth || 375
    const contentW = Math.floor((750 - 64 - 48) / 750 * w) // 弹层 left32+right32 + padding24*2
    const canvasW = Math.max(280, Math.min(contentW, 375))
    const canvasH = Math.round((500 / 375) * canvasW)
    this.setData({ canvasW, canvasH })

    const id = decodeQueryValue(options && options.id)
    const date = decodeQueryValue(options && options.date)
    const shape = decodeQueryValue(options && options.shape)
    const amount = decodeQueryValue(options && options.amount)
    const feeling = decodeQueryValue(options && options.feeling) || '开心'
    const openShare = decodeQueryValue(options && options.openShare) === '1'

    const all = loadRecords()
    const byId = getRecordById(all, id)
    const record = byId || {
      id,
      date,
      shape,
      amount,
      feeling,
      shareImagePath: '',
      shareSlogan: ''
    }

    if (!record || !record.date) {
      wx.showToast({ title: '缺少打卡数据', icon: 'none' })
      return
    }

    // 优先展示本地最新记录，同时保留当前路由传入的字段兜底
    record.shape = record.shape || shape
    record.amount = record.amount || amount
    record.feeling = record.feeling || feeling

    this.setData({ record }, () => {
      if (openShare) this.onGoShare()
      else this._preloadShareImages(record)
    })
    if (openShare) this._preloadShareImages(record)
  },

  _preloadShareImages(record) {
    if (!record) return
    const isConstipation = record.shape === '便秘' || record.shape === '拉不出来'
    const list = isConstipation ? CONSTIPATION_IMAGES : (SHAPE_IMAGES[record.shape] || SHAPE_IMAGES['完美'])
    const firstChosen = list[0]
    const url = getShitImageUrl(firstChosen)
    if (url) {
      wx.downloadFile({
        url,
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) {
            this._preloadedShitPath = res.tempFilePath
            this._preloadedChosen = firstChosen
          }
        },
        fail: () => {}
      })
    }
    const qrUrl = getMiniprogramQrUrl()
    if (qrUrl) {
      wx.downloadFile({
        url: qrUrl,
        success: (res) => { if (res.tempFilePath) this._preloadedQrPath = res.tempFilePath },
        fail: () => {}
      })
    } else if (MINIPROGRAM_QR_PATH) {
      wx.getImageInfo({
        src: MINIPROGRAM_QR_PATH,
        success: (r) => { this._preloadedQrPath = r.path },
        fail: () => {}
      })
    }
    // 预加载标题文字图片
    if (IMAGE_CDN_BASE) {
      var titleUrl = IMAGE_CDN_BASE.replace(/\/?$/, '/') + 'font3.png'
      wx.downloadFile({
        url: titleUrl,
        success: (res) => {
          if (res.statusCode === 200 && res.tempFilePath) this._preloadedTitlePath = res.tempFilePath
        },
        fail: () => {}
      })
    }
  },

  onGoShare() {
    if (!this.data.record) return
    this.setData({ sharePopupVisible: true })
    this.ensureShareImage()
  },

  closeSharePopup() {
    this.setData({ sharePopupVisible: false })
  },

  ensureShareImage() {
    const { record, shareLoading } = this.data
    if (!record || shareLoading) return

    // 始终重新生成，保证是「标题+日期+感想+屎图+文案」完整卡片（旧缓存可能是只有屎图的调试图）
    this._generateShareImage()
  },

  _generateShareImage() {
    const { record } = this.data
    if (!record) return

    const slogan = record.shareSlogan || SLOGANS[Math.floor(Math.random() * SLOGANS.length)]
    this.setData({ shareLoading: true, shareImageReady: false, slogan })

    const all = loadRecords()
    const dayRecords = getRecordsByDate(all, record.date)
    const totalCount = dayRecords.length
    const textA = SHAPE_TEXTS[record.shape] || ''
    const textB = AMOUNT_TEXTS[record.amount] || ''

    const that = this
    let done = false
    function finishLoading() {
      if (done) return
      done = true
      that.setData({ shareLoading: false })
    }
    const timeout = setTimeout(() => {
      if (!done) {
        console.warn('[confirm] 生成超时')
        finishLoading()
        wx.showToast({ title: '生成超时，请重试', icon: 'none' })
      }
    }, 8000)

    const isConstipation = record.shape === '便秘' || record.shape === '拉不出来'
    const list = isConstipation ? CONSTIPATION_IMAGES : (SHAPE_IMAGES[record.shape] || SHAPE_IMAGES['完美'])
    const chosen = list[Math.floor(Math.random() * list.length)]
    const cdnUrl = getShitImageUrl(chosen)
    const SHIT_PATHS = [
      cdnUrl,
      '/images/' + chosen + '.png',
      'images/' + chosen + '.png',
      '/' + chosen + '.png'
    ].filter(Boolean)
    const preloaded = that._preloadedShitPath && that._preloadedChosen === chosen ? that._preloadedShitPath : null
    if (preloaded) SHIT_PATHS.unshift(preloaded)
    const FALLBACK_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
    let qrImagePath = that._preloadedQrPath || null
    if (!qrImagePath) {
      const qrUrl = getMiniprogramQrUrl()
      if (qrUrl) {
        wx.downloadFile({
          url: qrUrl,
          success: res => { if (res.tempFilePath) qrImagePath = res.tempFilePath },
          fail: () => {}
        })
      }
      if (MINIPROGRAM_QR_PATH) {
        wx.getImageInfo({ src: MINIPROGRAM_QR_PATH, success: r => { if (!qrImagePath) qrImagePath = r.path }, fail: () => {} })
      }
    }
    // 临时文件 path 可能是 http://usr/xxx，不能加前缀 /，否则变成 /http://... 报 500
    function drawImagePath(p) {
      if (!p) return null
      if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('wxfile://')) return p
      return p.startsWith('/') ? p : '/' + p
    }
    function tryDraw(shitImagePath, opts) {
      opts = opts || {}
      const { totalCount = 0, textA = '', textB = '' } = opts
      const ctx = wx.createCanvasContext('shareCanvas', that)
      const record = that.data.record
      if (!record) return

      const cw = that.data.canvasW || W
      const ch = that.data.canvasH || H
      ctx.scale(cw / W, ch / H)

      const isConstipation = record.shape === '便秘' || record.shape === '拉不出来'
      const drawPath = shitImagePath ? drawImagePath(shitImagePath) : null

      // 背景
      ctx.setFillStyle('#f8f4f0')
      ctx.fillRect(0, 0, W, H)

      // 厕纸形状卡片：顶部卷纸弧度 + 底部锯齿撕裂边
      const cardX = 22
      const cardY = 25
      const cardW = W - 22*2
      const cardH = H - 50
      const curlH = 14
      const zigzagH = 8
      const zigzagCount = Math.round(cardW / 17)
      const toothW = cardW / zigzagCount

      ctx.beginPath()
      // 顶部：卷纸弧线
      ctx.moveTo(cardX, cardY)
      ctx.quadraticCurveTo(cardX + cardW / 2, cardY - curlH, cardX + cardW, cardY)
      // 右侧
      ctx.lineTo(cardX + cardW, cardY + cardH)
      // 底部：锯齿撕裂边
      for (var i = 0; i < zigzagCount; i++) {
        var bx = cardX + cardW - i * toothW
        ctx.lineTo(bx - toothW / 2, cardY + cardH - zigzagH)
        ctx.lineTo(bx - toothW, cardY + cardH)
      }
      // 左侧回到顶部
      ctx.closePath()

      ctx.setFillStyle('#fff')
      ctx.setStrokeStyle('#c4956a')
      ctx.setLineWidth(2)
      ctx.fill()
      ctx.stroke()

      // 顶部卷纸弧度下方阴影（增加立体感）
      ctx.beginPath()
      ctx.moveTo(cardX + 8, cardY + 4)
      ctx.quadraticCurveTo(cardX + cardW / 2, cardY + 10, cardX + cardW - 8, cardY + 4)
      ctx.setStrokeStyle('rgba(180, 150, 120, 0.15)')
      ctx.setLineWidth(1.5)
      ctx.stroke()

      // 标题「今日噗噗」：使用文字图片（优先 CDN，兜底本地）
      const titleImgW = 180
      const titleImgH = 180
      const titlePath = that._preloadedTitlePath || '/images/font3.png'
      ctx.drawImage(titlePath, (W - titleImgW) / 2, -56, titleImgW, titleImgH)

      // 日期 + 两侧装饰虚线
      ctx.setFontSize(14)
      ctx.setFillStyle('#999')
      ctx.setTextAlign('center')
      ctx.fillText(record.date, W / 2, 82)

      const dashY = 77
      ctx.setStrokeStyle('#c4956a')
      ctx.setLineWidth(1)
      ctx.setLineDash([4, 3], 0)
      ctx.beginPath()
      ctx.moveTo(80, dashY)
      ctx.lineTo(138, dashY)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(237, dashY)
      ctx.lineTo(295, dashY)
      ctx.stroke()
      ctx.setLineDash([], 0)

      if (isConstipation) {
        const bigSize = Math.round(260 * 0.79)
        const bigX = (W - bigSize) / 2
        const bigY = 98
        if (drawPath) {
          ctx.drawImage(drawPath, bigX, bigY, bigSize, bigSize)
        }
        ctx.setFillStyle('#5c5348')
        ctx.font = 'bold 20px "STSong", "Songti SC", serif'
        ctx.setTextAlign('center')
        ctx.fillText('我便秘了...', W / 2, bigY + bigSize + 30)
      } else {
        const shitSize = 56
        const shitX = (W - shitSize) / 2
        const shitY = 112
        if (drawPath) {
          ctx.drawImage(drawPath, shitX, shitY, shitSize, shitSize)
        }
        ctx.setFillStyle('#5c5348')
        const lineH = 28
        let y = 198
        ctx.setTextAlign('center')

        // 我在xx时xx分 / 拉出了xx的便便 / 份量（宋体加粗）
        ctx.font = 'bold 15px "STSong", "Songti SC", serif'
        var cDate = record.createdAt ? new Date(record.createdAt) : new Date()
        var hh = cDate.getHours()
        var mm = cDate.getMinutes()
        ctx.fillText('我在' + hh + '时' + (mm < 10 ? '0' + mm : mm) + '分', W / 2, y)
        y += lineH
        if (textA) { ctx.fillText(textA, W / 2, y); y += lineH }
        if (textB) { ctx.fillText(textB, W / 2, y); y += lineH }
        y += 26
        ctx.font = 'italic bold 15px "STSong", "Songti SC", serif'
        ctx.fillText('闺蜜，今天我真的感觉', W / 2, y)
        y += lineH
        ctx.fillText((record.feeling || '开心') + '屎了', W / 2, y)
        ctx.font = 'normal 15px "STSong", "Songti SC", serif'
      }

      // 底部 slogan 区：加高、标语左上、右侧固定位置小程序码、左下角 @拉噗噗lapupu，方框上移、底部留白
      const boxMargin = 38
      const boxW = W - boxMargin * 2
      const boxH = 80
      const boxX = boxMargin
      const bottomGap = 44
      const boxY = H - bottomGap - boxH
      const boxPad = 14
      const qrSize = 66
      const qrX = boxX + boxW - boxPad - qrSize
      const qrY = boxY + (boxH - qrSize) / 2

      ctx.setFillStyle('#f5f0eb')
      ctx.setStrokeStyle('#e8d5c4')
      ctx.setLineWidth(1)
      roundRect(ctx, boxX, boxY, boxW, boxH, 10)
      ctx.fill()
      ctx.stroke()

      ctx.font = 'normal 17px "PingFang SC", sans-serif'
      ctx.setTextAlign('left')
      ctx.setFillStyle('#5c5348')
      const sloganY = boxY + 28
      ctx.fillText(slogan, boxX + boxPad, sloganY)
      ctx.font = 'normal 12px "PingFang SC", sans-serif'
      ctx.setFillStyle('#8a7a6a')
      ctx.fillText('@拉噗噗lapupu', boxX + boxPad, sloganY + 22)

      if (qrImagePath) {
        const qrPath = drawImagePath(qrImagePath) || qrImagePath
        ctx.drawImage(qrPath, qrX, qrY, qrSize, qrSize)
      }

      const doDraw = () => {
        ctx.draw(false, () => {
          clearTimeout(timeout)
          const pr = Math.min(wx.getSystemInfoSync().pixelRatio || 2, 3)
          const outW = cw * pr
          const outH = ch * pr
          wx.canvasToTempFilePath({
            canvasId: 'shareCanvas',
            x: 0, y: 0, width: cw, height: ch, destWidth: outW, destHeight: outH, fileType: 'png',
            success: (res) => that._persistShareImage(res.tempFilePath, slogan),
            fail: (err) => {
              finishLoading()
              wx.showToast({ title: '生成失败', icon: 'none' })
            }
          }, that)
        })
      }
      if (drawPath) setTimeout(doDraw, 150)
      else doDraw()
    }
    function tryNext(i) {
      if (i >= SHIT_PATHS.length) {
        console.warn('[confirm] 所有路径都失败，写 base64 到临时文件再画')
        const fs = wx.getFileSystemManager()
        const tmpPath = `${wx.env.USER_DATA_PATH}/shit_fallback.png`
        fs.writeFile({
          filePath: tmpPath,
          data: FALLBACK_BASE64,
          encoding: 'base64',
          success: () => {
            wx.getImageInfo({
              src: tmpPath,
              success: (r) => tryDraw(r.path, { totalCount, textA, textB }),
              fail: () => tryDraw(null, { totalCount, textA, textB })
            })
          },
          fail: () => tryDraw(null, { totalCount, textA, textB })
        })
        return
      }
      const src = SHIT_PATHS[i]
      const isNetwork = typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))
      if (isNetwork) {
        wx.downloadFile({
          url: src,
          success: (res) => {
            if (res.statusCode === 200) {
              wx.getImageInfo({
                src: res.tempFilePath,
                success: (r) => tryDraw(r.path, { totalCount, textA, textB }),
                fail: () => tryNext(i + 1)
              })
            } else {
              console.warn('[confirm] 网络图下载非 200', src, 'statusCode=', res.statusCode)
              tryNext(i + 1)
            }
          },
          fail: (err) => {
            console.warn('[confirm] 网络图下载失败', src, err)
            tryNext(i + 1)
          }
        })
        return
      }
      wx.getImageInfo({
        src,
        success: (res) => {
          tryDraw(res.path, { totalCount, textA, textB })
        },
        fail: () => {
          tryNext(i + 1)
        }
      })
    }
    tryNext(0)
  },

  _persistShareImage(tempPath, slogan) {
    const { record } = this.data
    if (!record) return

    const fs = wx.getFileSystemManager()
    fs.saveFile({
      tempFilePath: tempPath,
      success: (saveRes) => {
        const savedPath = saveRes.savedFilePath || tempPath
        const updated = updateRecordById(record.id, {
          shareImagePath: savedPath,
          shareSlogan: slogan
        })
        this.setData({
          shareLoading: false,
          shareImageReady: true,
          shareImagePath: savedPath,
          shareImageTempPath: tempPath,
          record: updated || Object.assign({}, record, { shareImagePath: savedPath, shareSlogan: slogan }),
          slogan
        })
      },
      fail: () => {
        const updated = updateRecordById(record.id, {
          shareImagePath: tempPath,
          shareSlogan: slogan
        })
        this.setData({
          shareLoading: false,
          shareImageReady: true,
          shareImagePath: tempPath,
          shareImageTempPath: tempPath,
          record: updated || Object.assign({}, record, { shareImagePath: tempPath, shareSlogan: slogan }),
          slogan
        })
      }
    })
  },

  onShareImage() {
    const { shareImageReady, shareImagePath } = this.data
    if (!shareImageReady || !shareImagePath) {
      wx.showToast({ title: '图片生成中，请稍候', icon: 'none' })
      return
    }

    if (typeof wx.showShareImageMenu === 'function') {
      wx.showShareImageMenu({
        path: shareImagePath,
        fail: () => {
          wx.showToast({ title: '系统分享失败', icon: 'none' })
        }
      })
      return
    }

    wx.showModal({
      title: '当前版本不支持直接发图',
      content: '将为你保存到相册，再从微信聊天发送图片。',
      confirmText: '保存图片',
      success: (res) => {
        if (res.confirm) this.saveToAlbum()
      }
    })
  },

  saveToAlbum() {
    const { shareImagePath, shareImageReady, shareImageTempPath } = this.data
    if (!shareImageReady || !shareImagePath) {
      wx.showToast({ title: '图片生成中请稍候', icon: 'none' })
      return
    }
    const trySave = (path) => {
      wx.saveImageToPhotosAlbum({
        filePath: path,
        success() {
          wx.showToast({ title: '已保存到相册', icon: 'success' })
        },
        fail(err) {
          const msg = err.errMsg || ''
          if (msg.indexOf('auth deny') !== -1 || msg.indexOf('authorize') !== -1) {
            wx.showModal({
              title: '需要相册权限',
              content: '请点击「去设置」打开相册权限，才能保存图片。',
              confirmText: '去设置',
              success(res) {
                if (res.confirm) wx.openSetting()
              }
            })
          } else if (shareImageTempPath && path !== shareImageTempPath) {
            trySave(shareImageTempPath)
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        }
      })
    }
    trySave(shareImagePath)
  },

  onGoCalendar() {
    wx.reLaunch({ url: '/pages/result/result' })
  },

  onShareAppMessage() {
    const { record } = this.data
    const q = record
      ? 'id=' + encodeURIComponent(record.id || '') + '&date=' + encodeURIComponent(record.date || '') + '&shape=' + encodeURIComponent(record.shape || '') + '&amount=' + encodeURIComponent(record.amount || '') + '&feeling=' + encodeURIComponent(record.feeling || '')
      : ''
    return {
      title: '拉屎打卡 · 今日拉屎',
      path: '/pages/confirm/index' + (q ? '?' + q : '')
    }
  }
})
