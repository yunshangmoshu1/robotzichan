import { ref, onUnmounted } from 'vue'
import { readBarcodesFromImageData, readBarcodesFromImageFile } from 'zxing-wasm'

export function useScanner() {
  const isScanning = ref(false)
  const lastResult = ref(null)
  const error = ref(null)
  const cameraStream = ref(null)
  let scanTimer = null
  let videoEl = null

  // 启动摄像头实时扫描
  async function startScanner(containerId, onScan) {
    error.value = null

    const container = document.getElementById(containerId)
    if (!container) {
      error.value = '找不到扫描容器'
      return
    }

    try {
      // 申请后置摄像头
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      cameraStream.value = stream

      // 创建 video 元素
      videoEl = document.createElement('video')
      videoEl.srcObject = stream
      videoEl.autoplay = true
      videoEl.playsInline = true
      videoEl.muted = true
      videoEl.style.width = '100%'
      videoEl.style.borderRadius = '8px'
      videoEl.style.display = 'block'
      container.innerHTML = ''
      container.appendChild(videoEl)

      await videoEl.play()
      isScanning.value = true

      // 每 500ms 检测一次（平衡性能和灵敏度）
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      scanTimer = setInterval(async () => {
        if (!videoEl || !isScanning.value) return

        // 取当前视频帧
        canvas.width = videoEl.videoWidth
        canvas.height = videoEl.videoHeight
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const results = await readBarcodesFromImageData(imageData, {
            tryHarder: true,
            tryRotate: true,
            tryInvert: true,
            tryDownscale: true,
            maxNumberOfSymbols: 1,
          })

          if (results && results.length > 0) {
            const code = results[0].text
            if (!code) return

            // 去重：2 秒内相同结果不重复触发
            const now = Date.now()
            if (lastResult.value === code && now - (lastResult._time || 0) < 2000) return
            lastResult.value = code
            lastResult._time = now

            if (navigator.vibrate) navigator.vibrate(200)
            if (onScan) onScan(code)
          }
        } catch (e) {
          // 解码失败，继续扫描
        }
      }, 500)
    } catch (err) {
      error.value = '无法启动摄像头: ' + (err.message || err)
    }
  }

  function stopScanner() {
    isScanning.value = false

    if (scanTimer) {
      clearInterval(scanTimer)
      scanTimer = null
    }

    if (cameraStream.value) {
      cameraStream.value.getTracks().forEach(t => t.stop())
      cameraStream.value = null
    }

    if (videoEl) {
      videoEl.srcObject = null
      videoEl = null
    }
  }

  // 从图片文件解码（拍照识别）
  async function decodeFromImage(file) {
    const results = await readBarcodesFromImageFile(file, {
      tryHarder: true,
      tryRotate: true,
      tryInvert: true,
      tryDownscale: true,
    })

    if (results && results.length > 0 && results[0].text) {
      return results[0].text
    }
    throw new Error('未识别到条形码')
  }

  onUnmounted(() => {
    stopScanner()
  })

  return { isScanning, lastResult, error, startScanner, stopScanner, decodeFromImage }
}
