// 填写页 - 选择形状、份量后打卡
const SHAPES = ['完美', '偏硬', '偏软', '稀']
const AMOUNTS = ['少', '中', '多','超级无敌爆炸多']
const { addRecord, todayStr } = require('../../utils/records')

Page({
  data: {
    shapes: SHAPES,
    amounts: AMOUNTS,
    shapeIndex: 0,
    amountIndex: 0,
    selectedShape: SHAPES[0],
    selectedAmount: AMOUNTS[0],
    feeling: '',
    submitting: false
  },

  onFeelingInput(e) {
    const v = (e.detail.value || '').slice(0, 12)
    this.setData({ feeling: v })
  },

  onShapeChange(e) {
    const i = Number(e.detail.value)
    this.setData({ shapeIndex: i, selectedShape: SHAPES[i] })
  },

  onAmountChange(e) {
    const i = Number(e.detail.value)
    this.setData({ amountIndex: i, selectedAmount: AMOUNTS[i] })
  },

  onTapConstipation() {
    if (this.data.submitting) return
    const date = todayStr()
    this.setData({ submitting: true })
    try {
      const record = addRecord({ date, shape: '拉不出来', amount: '', feeling: '烦' })
      wx.showToast({ title: '已记录', icon: 'success' })
      setTimeout(() => {
        const q =
          'id=' + encodeURIComponent(record.id || '') +
          '&shape=' + encodeURIComponent('拉不出来') +
          '&date=' + encodeURIComponent(date)
        wx.redirectTo({
          url: '/pages/confirm/index?' + q,
          complete: () => this.setData({ submitting: false })
        })
      }, 600)
    } catch (e) {
      console.error(e)
      this.setData({ submitting: false })
      wx.showToast({ title: '记录失败，请重试', icon: 'none' })
    }
  },

  onTapSubmit() {
    if (this.data.submitting) return
    const { shapeIndex, amountIndex } = this.data
    const shape = SHAPES[shapeIndex]
    const amount = AMOUNTS[amountIndex]
    const date = todayStr()

    const feeling = (this.data.feeling || '').trim()
    this.setData({ submitting: true })
    try {
      const record = addRecord({ date, shape, amount, feeling })
      wx.showToast({ title: '打卡成功', icon: 'success' })
      setTimeout(() => {
        const q =
          'id=' +
          encodeURIComponent(record.id || '') +
          '&shape=' +
          encodeURIComponent(shape) +
          '&amount=' +
          encodeURIComponent(amount) +
          '&date=' +
          encodeURIComponent(date) +
          (feeling ? '&feeling=' + encodeURIComponent(feeling) : '')
        wx.redirectTo({
          url: '/pages/confirm/index?' + q,
          complete: () => {
            this.setData({ submitting: false })
          }
        })
      }, 800)
    } catch (e) {
      console.error(e)
      this.setData({ submitting: false })
      wx.showToast({ title: '打卡失败，请重试', icon: 'none' })
    }
  }
})
