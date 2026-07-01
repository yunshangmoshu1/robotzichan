import { ref, onUnmounted } from 'vue'
import Quagga from '@ericblade/quagga2'

export function useScanner() {
  const scanner = ref(null)
  const isScanning = ref(false)
  const lastResult = ref(null)
  const error = ref(null)

  function startScanner(containerId, onScan) {
    error.value = null

    const container = document.getElementById(containerId)
    if (!container) {
      error.value = '找不到扫描容器'
      return
    }

    Quagga.init({
      inputStream: {
        type: 'LiveStream',
        target: container,
        constraints: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      decoder: {
        readers: [
          'code_128_reader',
          'code_39_reader',
          'ean_reader',
          'ean_8_reader',
          'upc_reader',
          'upc_e_reader',
          'codabar_reader',
          'i2of5_reader',
        ],
      },
      locate: true,
      frequency: 10,
    }, (err) => {
      if (err) {
        error.value = '无法启动摄像头: ' + (err.message || err)
        return
      }
      Quagga.start()
      isScanning.value = true
    })

    Quagga.onDetected((result) => {
      if (!result || !result.codeResult) return
      const code = result.codeResult.code
      if (!code) return

      // 去重：连续相同结果间隔 2 秒
      const now = Date.now()
      if (lastResult.value === code && now - (lastResult._time || 0) < 2000) return
      lastResult.value = code
      lastResult._time = now

      // 振动反馈
      if (navigator.vibrate) navigator.vibrate(200)
      if (onScan) onScan(code)
    })
  }

  function stopScanner() {
    if (isScanning.value) {
      try {
        Quagga.stop()
      } catch (e) {
        // 忽略停止错误
      }
      isScanning.value = false
    }
  }

  onUnmounted(() => {
    stopScanner()
  })

  return { scanner, isScanning, lastResult, error, startScanner, stopScanner }
}
