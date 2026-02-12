// 结果页 - 以日历展示本月，有记录的日期打勾，可翻阅全年
const KEY = 'shit_records'

function pad(n) {
  return String(n).padStart(2, '0')
}

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

// 生成某年某月的日历格子（6 行 x 7 列，空位用 null）
function buildCalendar(year, month) {
  const first = new Date(year, month - 1, 1)
  const firstWeekday = first.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  // 前部空位
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const total = cells.length
  const rest = total % 7 === 0 ? 0 : 7 - (total % 7)
  for (let i = 0; i < rest; i++) cells.push(null)
  return cells
}

// 某天的 date 字符串
function dateStr(year, month, day) {
  return year + '-' + pad(month) + '-' + pad(day)
}

Page({
  data: {
    year: 0,
    month: 0,
    monthLabel: '',
    todayStr: '',
    recordDates: [],
    cells: [],
    weekLabels: ['日', '一', '二', '三', '四', '五', '六']
  },

  onLoad() {
    const list = wx.getStorageSync(KEY) || []
    const recordDates = list.map((r) => r.date)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    this._setMonth(year, month, recordDates)
  },

  _setMonth(year, month, recordDates) {
    const cells = buildCalendar(year, month)
    const firstWeekday = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()

    const cellList = cells.map((d) => {
      if (d == null) return { day: null, checked: false, isToday: false }
      const ds = dateStr(year, month, d)
      return {
        day: d,
        checked: recordDates.indexOf(ds) !== -1,
        isToday: ds === todayStr()
      }
    })

    this.setData({
      year,
      month,
      monthLabel: year + '年' + month + '月',
      todayStr: todayStr(),
      recordDates: recordDates,
      cells: cellList
    })
  },

  _getRecordDates() {
    const list = wx.getStorageSync(KEY) || []
    return list.map((r) => r.date)
  },

  prevMonth() {
    let { year, month } = this.data
    month--
    if (month < 1) {
      month = 12
      year--
    }
    this._setMonth(year, month, this._getRecordDates())
  },

  nextMonth() {
    let { year, month } = this.data
    month++
    if (month > 12) {
      month = 1
      year++
    }
    this._setMonth(year, month, this._getRecordDates())
  },

  onShareToday() {
    const list = wx.getStorageSync(KEY) || []
    const today = todayStr()
    const record = list.find((r) => r.date === today)
    if (!record) {
      wx.showToast({ title: '今日尚未打卡，先去打卡吧', icon: 'none' })
      return
    }
    const q = 'date=' + encodeURIComponent(record.date) + '&shape=' + encodeURIComponent(record.shape || '') + '&amount=' + encodeURIComponent(record.amount || '') + (record.feeling ? '&feeling=' + encodeURIComponent(record.feeling) : '')
    wx.navigateTo({ url: '/pages/share/index?' + q })
  }
})

