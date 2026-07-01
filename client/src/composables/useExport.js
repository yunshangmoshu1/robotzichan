import { ref } from 'vue'
import * as XLSX from 'xlsx'

export function useExport() {
  const exporting = ref(false)

  function exportToXlsx(data, filename = 'export') {
    exporting.value = true
    try {
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      XLSX.writeFile(wb, `${filename}.xlsx`)
    } finally {
      exporting.value = false
    }
  }

  function exportToCsv(data, filename = 'export') {
    exporting.value = true
    try {
      const ws = XLSX.utils.json_to_sheet(data)
      const csv = XLSX.utils.sheet_to_csv(ws)
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      exporting.value = false
    }
  }

  return { exporting, exportToXlsx, exportToCsv }
}
