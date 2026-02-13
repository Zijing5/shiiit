const {
  loadRecords,
  getRecordById,
  updateRecordById
} = require('../../utils/records')

const SLOGANS = [
  '闺蜜，今天你拉屎了吗？',
  '祝你大便永远通畅！',
  '喜报，我拉屎了！'
]

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
    slogan: ''
  },

  onLoad(options) {
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
    })
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

    const cachedPath = record.shareImagePath || ''
    if (cachedPath) {
      this.setData({ shareLoading: true })
      wx.getFileInfo({
        filePath: cachedPath,
        success: () => {
          this.setData({
            shareLoading: false,
            shareImageReady: true,
            shareImagePath: cachedPath,
            slogan: record.shareSlogan || ''
          })
        },
        fail: () => {
          this._generateShareImage()
        }
      })
      return
    }

    this._generateShareImage()
  },

  _generateShareImage() {
    const { record } = this.data
    if (!record) return

    const slogan = record.shareSlogan || SLOGANS[Math.floor(Math.random() * SLOGANS.length)]
    this.setData({ shareLoading: true, shareImageReady: false, slogan })
    const ctx = wx.createCanvasContext('shareCanvas', this)

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
    ctx.fillText(record.date, W / 2, 98)

    const feelingText = (record.feeling || '开心') + ' 屎了'
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
      wx.canvasToTempFilePath(
        {
          canvasId: 'shareCanvas',
          x: 0,
          y: 0,
          width: W,
          height: H,
          destWidth: W,
          destHeight: H,
          fileType: 'png',
          success: (res) => {
            this._persistShareImage(res.tempFilePath, slogan)
          },
          fail: () => {
            this.setData({ shareLoading: false })
            wx.showToast({ title: '生成失败', icon: 'none' })
          }
        },
        this
      )
    })
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
  },

  onGoCalendar() {
    wx.reLaunch({ url: '/pages/result/result' })
  }
})
