import { ref, onUnmounted } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'

export function useScanner() {
  const scanner = ref(null)
  const isScanning = ref(false)
  const lastResult = ref(null)
  const error = ref(null)

  async function startScanner(containerId, onScan) {
    try {
      error.value = null
      scanner.value = new Html5Qrcode(containerId)

      await scanner.value.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          lastResult.value = decodedText
          // 振动反馈
          if (navigator.vibrate) navigator.vibrate(200)
          if (onScan) onScan(decodedText)
        },
        () => {} // 忽略扫描失败（持续扫描）
      )

      isScanning.value = true
    } catch (err) {
      error.value = '无法启动摄像头: ' + err.message
      throw err
    }
  }

  async function stopScanner() {
    if (scanner.value && isScanning.value) {
      try {
        await scanner.value.stop()
      } catch (e) {
        // 忽略停止错误
      }
      scanner.value = null
      isScanning.value = false
    }
  }

  onUnmounted(() => {
    stopScanner()
  })

  return { scanner, isScanning, lastResult, error, startScanner, stopScanner }
}
