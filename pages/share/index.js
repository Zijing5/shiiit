// 调试：分享页只画 shit0 图片，其它全部注释，看图片能否显示
const W = 375
const H = 500

const SHIT_IMAGE_PATHS = ['/images/shit0_small.png', '/images/shit0.png', '/pages/share/shit0.png']

Page({
  data: {
    shareImagePath: '',
    shareImageReady: false
  },

  onLoad() {
    const that = this
    setTimeout(() => that._drawOnlyShit(), 400)
  },

  _drawOnlyShit() {
    const that = this
    wx.showLoading({ title: '加载中...' })

    function ensureSlash(path) {
      return path && !path.startsWith('/') ? '/' + path : path
    }
    function tryDraw(path) {
      const ctx = wx.createCanvasContext('shareCanvas', that)
      // 只画一个灰底 + 一张 shit 图，其它全不画
      ctx.setFillStyle('#eee')
      ctx.fillRect(0, 0, W, H)
      if (path) {
        const p = ensureSlash(path)
        console.log('drawImage path:', p)
        ctx.drawImage(p, (W - 56) / 2, (H - 56) / 2, 56, 56)
      } else {
        console.warn('无可用 path，不画图')
      }
      const doDraw = () => {
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
              wx.showToast({ title: '导出失败', icon: 'none' })
              console.error('canvasToTempFilePath fail', err)
            }
          }, that)
        })
      }
      // 有图时延迟再 draw，否则旧版 canvas 可能还没画完就导出
      if (path) setTimeout(doDraw, 350)
      else doDraw()
    }
    function tryNext(index) {
      if (index >= SHIT_IMAGE_PATHS.length) {
        console.warn('所有路径都失败')
        tryDraw(null)
        return
      }
      const src = SHIT_IMAGE_PATHS[index]
      wx.getImageInfo({
        src,
        success(res) {
          console.log('getImageInfo success', src, 'path=', res.path)
          tryDraw(res.path)
        },
        fail(err) {
          console.warn('getImageInfo fail', src, err)
          tryNext(index + 1)
        }
      })
    }
    tryNext(0)
  }

  // onClose() {
  //   wx.reLaunch({ url: '/pages/result/result' })
  // },
  // onShareAppMessage() { ... },
  // saveToAlbum() { ... },
})
