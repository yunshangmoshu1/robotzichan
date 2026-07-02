import { ref, onUnmounted } from 'vue'
import Tesseract from 'tesseract.js'
import { readBarcodesFromImageData, readBarcodesFromImageFile } from 'zxing-wasm'

let worker = null
let workerReady = false

// 初始化 OCR Worker（后台预加载）
async function initOCRWorker() {
  if (workerReady) return
  try {
    worker = await Tesseract.createWorker('eng', 1, {})
    workerReady = true
  } catch (e) {
    console.error('OCR worker 初始化失败:', e)
  }
}

// 从图片中识别数字
async function recognizeNumbers(imageSource) {
  // 先尝试条码/QR 解码（zxing-wasm，速度快）
  try {
    let results
    if (imageSource instanceof File || imageSource instanceof Blob) {
      results = await readBarcodesFromImageFile(imageSource, {
        tryHarder: true,
        tryRotate: true,
        tryInvert: true,
      })
    } else if (imageSource instanceof ImageData) {
      results = await readBarcodesFromImageData(imageSource, {
        tryHarder: true,
        tryRotate: true,
        tryInvert: true,
      })
    }
    if (results && results.length > 0 && results[0].text) {
      return { code: results[0].text, source: 'barcode' }
    }
  } catch (e) {
    // 条码解码失败，继续 OCR
  }

  // 条码解码失败，用 OCR 识别文字
  await initOCRWorker()
  if (!worker) throw new Error('OCR 未就绪')

  // 把图片源转为可识别的格式
  let image
  if (imageSource instanceof File || imageSource instanceof Blob) {
    image = imageSource
  } else if (imageSource instanceof ImageData) {
    // ImageData → canvas → Blob
    const canvas = document.createElement('canvas')
    canvas.width = imageSource.width
    canvas.height = imageSource.height
    const ctx = canvas.getContext('2d')
    ctx.putImageData(imageSource, 0, 0)
    image = await new Promise(r => canvas.toBlob(r, 'image/png'))
  }

  const result = await worker.recognize(image)
  const text = result.data.text || ''

  // 从 OCR 文本中提取数字（连续数字串）
  const numbers = text.match(/\d{3,}/g)
  if (numbers && numbers.length > 0) {
    // 取最长的数字串（最可能是条码号码）
    const best = numbers.sort((a, b) => b.length - a.length)[0]
    return { code: best, source: 'ocr', rawText: text.trim() }
  }

  throw new Error('未识别到数字')
}

export function useScanner() {
  const isScanning = ref(false)
  const lastResult = ref(null)
  const error = ref(null)
  const cameraStream = ref(null)
  let scanTimer = null
  let videoEl = null
  let canvas = null
  let ctx = null

  async function startScanner(containerId, onScan) {
    error.value = null

    const container = document.getElementById(containerId)
    if (!container) {
      error.value = '找不到扫描容器'
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      cameraStream.value = stream

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

      // 预热 OCR worker
      initOCRWorker()

      canvas = document.createElement('canvas')
      ctx = canvas.getContext('2d', { willReadFrequently: true })

      // 每 1.5 秒检测一帧（OCR 较重，不能太频繁）
      scanTimer = setInterval(async () => {
        if (!videoEl || !isScanning.value) return

        canvas.width = videoEl.videoWidth
        canvas.height = videoEl.videoHeight
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const { code } = await recognizeNumbers(imageData)

          // 去重
          const now = Date.now()
          if (lastResult.value === code && now - (lastResult._time || 0) < 2000) return
          lastResult.value = code
          lastResult._time = now

          if (navigator.vibrate) navigator.vibrate(200)
          if (onScan) onScan(code)
        } catch (e) {
          // 未识别到，继续扫描
        }
      }, 1500)
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

  // 拍照识别
  async function decodeFromImage(file) {
    const { code } = await recognizeNumbers(file)
    return code
  }

  onUnmounted(() => {
    stopScanner()
  })

  return { isScanning, lastResult, error, startScanner, stopScanner, decodeFromImage }
}
