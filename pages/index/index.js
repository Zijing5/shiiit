// 首页
const {
  loadRecords,
  todayStr,
  getDateStats,
  getStreakEndingToday,
  getLatestRecordByDate
} = require('../../utils/records')

Page({
  data: {
    todayStatus: '今天还没打卡',
    todaySubStatus: '去完成一次打卡吧',
    streakCount: 0,
    hasTodayRecord: false,
    latestTodayRecord: null
  },

  onShow() {
    this.refreshDashboard()
  },

  onTapCheckIn() {
    wx.navigateTo({ url: '/pages/record/index' })
  },

  onTapCalendar() {
    wx.navigateTo({ url: '/pages/result/result' })
  },

  onTapViewCheckIn() {
    const record = this.data.latestTodayRecord
    if (!record) {
      wx.showToast({ title: '今天还没打卡', icon: 'none' })
      return
    }
    const q =
      'id=' +
      encodeURIComponent(record.id || '') +
      '&date=' +
      encodeURIComponent(record.date || '') +
      '&shape=' +
      encodeURIComponent(record.shape || '') +
      '&amount=' +
      encodeURIComponent(record.amount || '') +
      '&feeling=' +
      encodeURIComponent(record.feeling || '') +
      '&openShare=1'
    wx.navigateTo({ url: '/pages/confirm/index?' + q })
  },

  refreshDashboard() {
    const records = loadRecords()
    const stats = getDateStats(records)
    const today = todayStr()
    const todayStats = stats[today]
    const latestTodayRecord = getLatestRecordByDate(records, today)
    let todayStatus = '今天还没打卡'
    let todaySubStatus = '去完成一次打卡吧'

    if (todayStats && todayStats.latestRecord) {
      const last = todayStats.latestRecord
      todayStatus = '今日已打卡'
      todaySubStatus =
        '共' +
        todayStats.count +
        '次，最后一次：' +
        (last.feeling || '开心') +
        '屎了 · ' +
        (last.shape || '未填') +
        ' · ' +
        (last.amount || '未填')
    }

    this.setData({
      todayStatus,
      todaySubStatus,
      streakCount: getStreakEndingToday(records),
      hasTodayRecord: !!latestTodayRecord,
      latestTodayRecord: latestTodayRecord || null
    })
  }
})
