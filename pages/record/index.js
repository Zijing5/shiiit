// 填写页 - 选择形状、分量后打卡
const SHAPES = ['正常', '偏硬', '偏软', '稀']
const AMOUNTS = ['少', '中', '多','超级无敌爆炸多']

Page({
  data: {
    shapes: SHAPES,
    amounts: AMOUNTS,
    shapeIndex: 0,
    amountIndex: 0,
    selectedShape: SHAPES[0],
    selectedAmount: AMOUNTS[0],
    feeling: ''
  },

  onFeelingInput(e) {
    this.setData({ feeling: e.detail.value })
  },

  onShapeChange(e) {
    const i = Number(e.detail.value)
    this.setData({ shapeIndex: i, selectedShape: SHAPES[i] })
  },

  onAmountChange(e) {
    const i = Number(e.detail.value)
    this.setData({ amountIndex: i, selectedAmount: AMOUNTS[i] })
  },

  onTapSubmit() {
    const { shapeIndex, amountIndex } = this.data
    const shape = SHAPES[shapeIndex]
    const amount = AMOUNTS[amountIndex]
    const date = this._todayStr()

    const feeling = (this.data.feeling || '').trim()
    const record = { date, shape, amount, feeling }
    const key = 'shit_records'
    const list = wx.getStorageSync(key) || []
    list.push(record)
    wx.setStorageSync(key, list)

    wx.showToast({ title: '打卡成功', icon: 'success' })
    setTimeout(() => {
      const q = 'shape=' + encodeURIComponent(shape) + '&amount=' + encodeURIComponent(amount) + '&date=' + encodeURIComponent(date) + (feeling ? '&feeling=' + encodeURIComponent(feeling) : '')
      wx.navigateTo({ url: '/pages/share/index?' + q })
    }, 800)
  },

  _todayStr() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return y + '-' + m + '-' + day
  }
})
