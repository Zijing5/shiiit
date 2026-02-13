const KEY = 'shit_records'

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatDate(dateObj) {
  return (
    dateObj.getFullYear() +
    '-' +
    pad(dateObj.getMonth() + 1) +
    '-' +
    pad(dateObj.getDate())
  )
}

function todayStr() {
  return formatDate(new Date())
}

function shiftDate(dateStr, offsetDays) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + offsetDays)
  return formatDate(d)
}

function toTimestamp(value, fallbackDate, index) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const ts = Date.parse(value)
    if (Number.isFinite(ts)) return ts
  }
  const base = Date.parse((fallbackDate || todayStr()) + 'T00:00:00')
  return base + index
}

function normalizeRecord(raw, index) {
  const date = (raw && raw.date) || todayStr()
  const hasRealTime = !!(raw && (typeof raw.createdAt === 'number' || (typeof raw.createdAt === 'string' && raw.createdAt.length > 10)))
  const createdAt = toTimestamp(raw && raw.createdAt, date, index)
  const id = (raw && raw.id) || ('legacy-' + createdAt + '-' + index)
  return {
    id,
    date,
    shape: (raw && raw.shape) || '',
    amount: (raw && raw.amount) || '',
    feeling: (raw && raw.feeling) || '',
    createdAt,
    hasRealTime,
    shareImagePath: (raw && raw.shareImagePath) || '',
    shareSlogan: (raw && raw.shareSlogan) || ''
  }
}

function loadRecords() {
  const raw = wx.getStorageSync(KEY)
  if (!Array.isArray(raw)) return []
  let changed = false
  const list = raw.map((item, index) => {
    const normalized = normalizeRecord(item, index)
    if (!item || !item.id || item.hasRealTime === undefined) changed = true
    return normalized
  })
  if (changed) saveRecords(list)
  return list
}

function saveRecords(list) {
  wx.setStorageSync(KEY, Array.isArray(list) ? list : [])
}

function addRecord(partial) {
  const list = loadRecords()
  const now = Date.now()
  const record = {
    id: 'r-' + now + '-' + Math.floor(Math.random() * 1000000),
    date: (partial && partial.date) || todayStr(),
    shape: (partial && partial.shape) || '',
    amount: (partial && partial.amount) || '',
    feeling: (partial && partial.feeling) || '',
    createdAt: now,
    hasRealTime: true
  }
  list.push(record)
  saveRecords(list)
  return record
}

function getRecordsByDate(list, date) {
  return (Array.isArray(list) ? list : [])
    .filter((r) => r.date === date)
    .sort((a, b) => a.createdAt - b.createdAt)
}

function getLatestRecordByDate(list, date) {
  const rows = getRecordsByDate(list, date)
  return rows.length ? rows[rows.length - 1] : null
}

function getDateStats(list) {
  const map = {}
  ;(Array.isArray(list) ? list : []).forEach((record) => {
    const d = record.date
    if (!map[d]) {
      map[d] = { count: 0, latestRecord: null }
    }
    map[d].count += 1
    if (!map[d].latestRecord || record.createdAt >= map[d].latestRecord.createdAt) {
      map[d].latestRecord = record
    }
  })
  return map
}

function getStreakEndingToday(list) {
  const stats = getDateStats(list)
  const today = todayStr()
  if (!stats[today]) return 0
  let streak = 0
  while (stats[shiftDate(today, -streak)]) {
    streak += 1
  }
  return streak
}

function formatTime(createdAt) {
  if (!createdAt) return '--:--'
  const d = new Date(createdAt)
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function getRecordById(list, id) {
  if (!id) return null
  const rows = Array.isArray(list) ? list : []
  return rows.find((r) => r.id === id) || null
}

function updateRecordById(id, patch) {
  if (!id) return null
  const list = loadRecords()
  const idx = list.findIndex((r) => r.id === id)
  if (idx < 0) return null
  list[idx] = Object.assign({}, list[idx], patch || {})
  saveRecords(list)
  return list[idx]
}

module.exports = {
  KEY,
  todayStr,
  loadRecords,
  saveRecords,
  addRecord,
  getRecordsByDate,
  getLatestRecordByDate,
  getDateStats,
  getStreakEndingToday,
  formatTime,
  getRecordById,
  updateRecordById
}
