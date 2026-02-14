/**
 * 图片资源配置 - 控制包体积的常见做法
 *
 * 1. 包内图（当前）：图片放在项目 images/ 或根目录，打包进小程序
 * 2. CDN 图（推荐）：上传到腾讯云 COS 等，填下面 IMAGE_CDN_BASE
 * 3. 分包 / 压缩：见下方注释
 */

// 填 CDN 基础地址后，优先从网络拉图，不占包体积。留空则用包内图
const IMAGE_CDN_BASE = 'https://data-1404699461.cos.ap-shanghai.myqcloud.com/lapupu/test/'

/*
 * 腾讯云 COS 操作步骤（小程序用腾讯云较方便，同系、同账号）：
 *
 * 1. 打开 https://console.cloud.tencent.com/cos ，用微信/QQ 登录
 * 2. 存储桶列表 → 创建存储桶
 *    - 名称：如 shiiit-images（需全局唯一）
 *    - 地域：选离用户近的，如 北京、上海
 *    - 访问权限：选「公有读私有写」（这样小程序才能直接通过 URL 读图）
 * 3. 创建后进入该桶 → 文件列表 → 上传文件，建个目录如 shit/，把 shit1.png～shit14.png 传进去
 * 4. 在 安全管理 → 域名管理 里可以看到「默认域名」，格式类似：
 *    https://shiiit-images-1234567890.cos.ap-beijing.myqcloud.com
 *    你的 baseUrl = 默认域名 + 目录，例如：
 *    https://shiiit-images-1234567890.cos.ap-beijing.myqcloud.com/shit/
 * 5. 小程序后台（微信公众平台）→ 开发 → 开发管理 → 开发设置 → 服务器域名：
 *    - request 合法域名：添加 https://你的桶.cos.地域.myqcloud.com（不要带路径）
 *    - downloadFile 合法域名：也添加同一个域名（getImageInfo 拉网络图会走下载）
 * 6. 读不出图时自查：桶是否「公有读」、域名是否填对、浏览器直接打开图片 URL 能否打开
 *
 * GitHub raw 示例: 'https://raw.githubusercontent.com/用户名/仓库/main/images/'
 */

function getShitImageUrl(name) {
  if (!name || typeof name !== 'string') return ''
  const file = name.indexOf('.png') > -1 ? name : name + '.png'
  if (IMAGE_CDN_BASE) {
    return IMAGE_CDN_BASE.replace(/\/?$/, '/') + file
  }
  return ''
}

/** 分享卡片底部小程序码：优先 CDN test 目录 qrcode.png，否则包内 /images/qrcode.png */
function getMiniprogramQrUrl() {
  if (!IMAGE_CDN_BASE) return ''
  return IMAGE_CDN_BASE.replace(/\/?$/, '/') + 'qrcode.jpg'
}

const MINIPROGRAM_QR_PATH = '/images/qrcode.jpg'

module.exports = {
  IMAGE_CDN_BASE,
  getShitImageUrl,
  getMiniprogramQrUrl,
  MINIPROGRAM_QR_PATH
}
