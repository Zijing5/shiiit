// 结果页 - 日历展示 + 按天查看详情 + 删除误打卡
const {
  loadRecords,
  saveRecords,
  todayStr,
  getDateStats,
  getRecordsByDate,
  getLatestRecordByDate,
  formatTime
} = require('../../utils/records')

function pad(n) {
  return String(n).padStart(2, '0')
}

function buildCalendar(year, month) {
  const first = new Date(year, month - 1, 1)
  const firstWeekday = first.getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const rest = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
  for (let i = 0; i < rest; i++) cells.push(null)
  return cells
}

function dateStr(year, month, day) {
  return year + '-' + pad(month) + '-' + pad(day)
}

Page({
  data: {
    year: 0,
    month: 0,
    monthLabel: '',
    todayStr: '',
    cells: [],
    dateStats: {},
    weekLabels: ['日', '一', '二', '三', '四', '五', '六'],
    detailVisible: false,
    selectedDate: '',
    selectedSummary: '',
    selectedRecords: []
  },

  onLoad() {
    const now = new Date()
    this._setMonth(now.getFullYear(), now.getMonth() + 1, loadRecords())
  },

  onShow() {
    if (!this.data.year || !this.data.month) return
    this._setMonth(this.data.year, this.data.month, loadRecords())
  },

  _setMonth(year, month, records) {
    const stats = getDateStats(records)
    const cellList = buildCalendar(year, month).map((d) => {
      if (d == null) {
        return { day: null, checked: false, isToday: false, count: 0 }
      }
      const ds = dateStr(year, month, d)
      const oneDay = stats[ds]
      return {
        day: d,
        checked: !!oneDay,
        count: oneDay ? oneDay.count : 0,
        isToday: ds === todayStr()
      }
    })

    this.setData({
      year,
      month,
      monthLabel: year + '年' + month + '月',
      todayStr: todayStr(),
      dateStats: stats,
      cells: cellList
    })
  },

  prevMonth() {
    let { year, month } = this.data
    month -= 1
    if (month < 1) {
      month = 12
      year -= 1
    }
    this._setMonth(year, month, loadRecords())
  },

  nextMonth() {
    let { year, month } = this.data
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    this._setMonth(year, month, loadRecords())
  },

  onTapDay(e) {
    const day = Number(e.currentTarget.dataset.day)
    if (!day) return
    const date = dateStr(this.data.year, this.data.month, day)
    this._openDateDetail(date, loadRecords())
  },

  _openDateDetail(date, records) {
    const list = getRecordsByDate(records, date).sort((a, b) => b.createdAt - a.createdAt)
    const latest = list.length ? list[0] : null
    const selectedSummary = latest
      ? '共' +
        list.length +
        '次，最后一次：' +
        (latest.feeling || '开心') +
        '屎了 · ' +
        (latest.shape || '未填') +
        ' · ' +
        (latest.amount || '未填')
      : '当天暂无打卡记录'

    this.setData({
      detailVisible: true,
      selectedDate: date,
      selectedSummary,
      selectedRecords: list.map((r) => ({
        id: r.id,
        shape: r.shape || '未填',
        amount: r.amount || '未填',
        feeling: (r.feeling || '开心') + '屎了',
        timeText: formatTime(r.createdAt)
      }))
    })
  },

  closeDetail() {
    this.setData({ detailVisible: false })
  },

  onDeleteRecord(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.showModal({
      title: '删除确认',
      content: '确认删除这条打卡吗？',
      success: (res) => {
        if (!res.confirm) return
        const list = loadRecords()
        const next = list.filter((r) => r.id !== id)
        saveRecords(next)
        this._setMonth(this.data.year, this.data.month, next)
        this._openDateDetail(this.data.selectedDate, next)
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  onShareToday() {
    const list = loadRecords()
    const today = todayStr()
    const record = getLatestRecordByDate(list, today)
    if (!record) {
      wx.showToast({ title: '今日尚未打卡，先去打卡吧', icon: 'none' })
      return
    }
    const q =
      'id=' +
      encodeURIComponent(record.id || '') +
      '&date=' +
      encodeURIComponent(record.date) +
      '&shape=' +
      encodeURIComponent(record.shape || '') +
      '&amount=' +
      encodeURIComponent(record.amount || '') +
      (record.feeling ? '&feeling=' + encodeURIComponent(record.feeling) : '') +
      '&openShare=1'
    wx.navigateTo({ url: '/pages/confirm/index?' + q })
  }
})

