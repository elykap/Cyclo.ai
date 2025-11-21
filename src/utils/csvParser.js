/**
 * CSV Parser utility for POS data
 * Parses CSV files and converts them to structured data
 */

/**
 * Parse CSV text into array of objects
 * @param {string} csvText - The CSV file content as text
 * @param {Object} options - Parsing options
 * @returns {Array<Object>} Array of parsed row objects
 */
export function parseCSV(csvText, options = {}) {
  const {
    delimiter = ',',
    hasHeaders = true,
    skipEmptyLines = true
  } = options

  const lines = csvText.split(/\r?\n/).filter(line => {
    if (skipEmptyLines) {
      return line.trim().length > 0
    }
    return true
  })

  if (lines.length === 0) {
    return []
  }

  // Parse headers
  const headerLine = lines[0]
  const headers = parseCSVLine(headerLine, delimiter).map(h => h.trim().toLowerCase())

  // Find column indices for our schema
  const columnMap = {
    product_id: findColumnIndex(headers, ['product_id', 'product id', 'productid', 'id', 'sku']),
    product_name: findColumnIndex(headers, ['product_name', 'product name', 'productname', 'name', 'item', 'item_name']),
    price: findColumnIndex(headers, ['price', 'unit_price', 'unit price', 'cost', 'amount']),
    amount: findColumnIndex(headers, ['amount', 'quantity', 'qty', 'count', 'units']),
    customer_id: findColumnIndex(headers, ['customer_id', 'customer id', 'customerid', 'customer', 'client_id', 'client id']),
    date: findColumnIndex(headers, ['date', 'transaction_date', 'transaction date', 'timestamp', 'time', 'created_at', 'created at'])
  }

  // Parse data rows
  const startIndex = hasHeaders ? 1 : 0
  const rows = []

  for (let i = startIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter)
    
    if (values.length === 0) continue

    const row = {}

    // Map values to our schema
    Object.keys(columnMap).forEach(key => {
      const colIndex = columnMap[key]
      if (colIndex !== -1 && colIndex < values.length) {
        let value = values[colIndex].trim()
        
        // Type conversion
        if (key === 'price' || key === 'amount') {
          // Remove currency symbols and parse as number
          value = parseFloat(value.replace(/[^0-9.-]/g, '')) || null
        } else if (key === 'date') {
          // Try to parse date
          const parsedDate = parseDate(value)
          value = parsedDate ? parsedDate.toISOString() : null
        } else {
          value = value || null
        }
        
        row[key] = value
      } else {
        row[key] = null
      }
    })

    // Only add row if it has at least one non-null value
    if (Object.values(row).some(v => v !== null)) {
      rows.push(row)
    }
  }

  return rows
}

/**
 * Parse a single CSV line handling quoted values
 * @param {string} line - CSV line
 * @param {string} delimiter - Column delimiter
 * @returns {Array<string>} Array of column values
 */
function parseCSVLine(line, delimiter) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      // End of column
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }

  // Add last column
  values.push(current)

  return values
}

/**
 * Find column index by trying multiple possible header names
 * @param {Array<string>} headers - Array of header names
 * @param {Array<string>} possibleNames - Possible names for the column
 * @returns {number} Column index or -1 if not found
 */
function findColumnIndex(headers, possibleNames) {
  for (const name of possibleNames) {
    const index = headers.findIndex(h => h === name || h.replace(/[_\s]/g, '') === name.replace(/[_\s]/g, ''))
    if (index !== -1) {
      return index
    }
  }
  return -1
}

/**
 * Parse various date formats
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed date or null
 */
function parseDate(dateString) {
  if (!dateString || dateString.trim() === '') {
    return null
  }

  // Try ISO format first
  let date = new Date(dateString)
  if (!isNaN(date.getTime())) {
    return date
  }

  // Try common formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
    /(\d{4})\/(\d{2})\/(\d{2})/, // YYYY/MM/DD
  ]

  for (const format of formats) {
    const match = dateString.match(format)
    if (match) {
      if (format === formats[0] || format === formats[3]) {
        // YYYY-MM-DD or YYYY/MM/DD
        date = new Date(match[1], match[2] - 1, match[3])
      } else {
        // MM/DD/YYYY or MM-DD-YYYY
        date = new Date(match[3], match[1] - 1, match[2])
      }
      if (!isNaN(date.getTime())) {
        return date
      }
    }
  }

  return null
}

/**
 * Read CSV file as text
 * @param {File} file - CSV file object
 * @returns {Promise<string>} CSV content as text
 */
export function readCSVFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      resolve(e.target.result)
    }
    
    reader.onerror = (e) => {
      reject(new Error('Failed to read CSV file'))
    }
    
    reader.readAsText(file)
  })
}

