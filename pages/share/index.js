// 分享页 - 仅展示打卡图 + 保存/分享 + 右上角关闭，关闭后进入日历
const SLOGANS = [
  '闺蜜，今天你拉屎了吗？',
  '祝你大便永远通畅！',
  '喜报，我拉屎了！'
]

const W = 375
const H = 500

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
    todayRecord: null,
    shareImagePath: '',
    shareImageReady: false
  },

  onLoad(options) {
    if (!options.date) {
      wx.showToast({ title: '缺少打卡数据', icon: 'none' })
      return
    }
    const feeling = (options.feeling && options.feeling.trim()) ? options.feeling.trim() : '开心'
    this.setData({
      todayRecord: {
        date: options.date,
        shape: options.shape || '',
        amount: options.amount || '',
        feeling: feeling
      }
    }, () => {
      const that = this
      setTimeout(() => that._generateShareImage(), 400)
    })
  },

  onClose() {
    wx.redirectTo({ url: '/pages/result/result' })
  },

  onShareAppMessage() {
    const path = this.data.shareImagePath
    return {
      title: '今日拉屎打卡',
      path: '/pages/result/result',
      imageUrl: path || undefined
    }
  },

  _generateShareImage() {
    const { todayRecord } = this.data
    if (!todayRecord) return
    const slogan = SLOGANS[Math.floor(Math.random() * SLOGANS.length)]
    wx.showLoading({ title: '生成中...' })
    this._drawShareCard(todayRecord, slogan, this)
  },

  _drawShareCard(todayRecord, slogan, that) {
    const ctx = wx.createCanvasContext('shareCanvas', that)
    const dpr = wx.getSystemInfoSync().pixelRatio || 2

    ctx.setFillStyle('#f8f4f0')
    ctx.fillRect(0, 0, W, H)
    ctx.setFillStyle('#c4956a')
    ctx.fillRect(15, 15, W - 30, H - 30)
    ctx.setFillStyle('#fff')
    ctx.setStrokeStyle('#e8d5c4')
    ctx.setLineWidth(1.5)
    roundRect(ctx, 20, 20, W - 40, H - 40, 10)
    ctx.fill()
    ctx.stroke()

    ctx.setFillStyle('#333')
    ctx.setFontSize(18)
    ctx.setTextAlign('center')
    ctx.fillText('今日拉屎', W / 2, 62)
    ctx.setFontSize(14)
    ctx.setFillStyle('#666')
    ctx.fillText(todayRecord.date, W / 2, 98)

    const feelingText = (todayRecord.feeling || '开心') + ' 屎了'
    ctx.setFontSize(16)
    ctx.setFillStyle('#c4956a')
    ctx.fillText(feelingText, W / 2, 158)

    const blockX = 35
    const blockY = 208
    const blockW = W - 70
    const blockH = 44
    ctx.setFillStyle('#f5f0eb')
    ctx.setStrokeStyle('#e8d5c4')
    ctx.setLineWidth(1)
    roundRect(ctx, blockX, blockY, blockW, blockH, 8)
    ctx.fill()
    ctx.stroke()
    ctx.setFillStyle('#666')
    ctx.setFontSize(14)
    ctx.fillText(slogan, W / 2, blockY + blockH / 2 + 4)

    ctx.draw(false, () => {
      wx.hideLoading()
      wx.canvasToTempFilePath({
        canvasId: 'shareCanvas',
        x: 0,
        y: 0,
        width: W,
        height: H,
        destWidth: W,
        destHeight: H,
        fileType: 'png',
        success(res) {
          that.setData({ shareImagePath: res.tempFilePath, shareImageReady: true })
        },
        fail(err) {
          wx.showToast({ title: '生成失败', icon: 'none' })
          console.error(err)
        }
      }, that)
    })
  },

  saveToAlbum() {
    const { shareImagePath, shareImageReady } = this.data
    if (!shareImageReady || !shareImagePath) {
      wx.showToast({ title: '图片生成中请稍候', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: shareImagePath,
      success() {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
      },
      fail(err) {
        if (err.errMsg && err.errMsg.indexOf('auth deny') !== -1) {
          wx.showModal({
            title: '提示',
            content: '需要您授权保存图片到相册',
            confirmText: '去设置',
            success(res) {
              if (res.confirm) wx.openSetting()
            }
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  }
})
