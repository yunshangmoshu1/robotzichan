import { ref, onUnmounted } from 'vue'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

export function useScanner() {
  const scanner = ref(null)
  const isScanning = ref(false)
  const lastResult = ref(null)
  const error = ref(null)

  async function startScanner(containerId, onScan) {
    try {
      error.value = null
      scanner.value = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
      })

      // 根据容器实际宽度动态计算扫描框大小
      const container = document.getElementById(containerId)
      const containerWidth = container ? container.offsetWidth : 300
      const scanSize = Math.min(Math.floor(containerWidth * 0.9), 500)

      await scanner.value.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: scanSize, height: scanSize },
          aspectRatio: 1.0,
          disableFlip: false,
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
