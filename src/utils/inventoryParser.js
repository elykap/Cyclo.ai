/**
 * Inventory CSV Parser utility
 * Parses inventory CSV files with product_name, product_id, total_sales
 */

/**
 * Parse inventory CSV text into array of objects
 * @param {string} csvText - The CSV file content as text
 * @param {Object} options - Parsing options
 * @returns {Array<Object>} Array of parsed inventory items
 */
export function parseInventoryCSV(csvText, options = {}) {
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

  // Find column indices for inventory schema
  const columnMap = {
    product_id: findColumnIndex(headers, ['product_id', 'product id', 'productid', 'id', 'sku', 'item_id', 'item id']),
    product_name: findColumnIndex(headers, ['product_name', 'product name', 'productname', 'name', 'item', 'item_name', 'item name', 'product']),
    total_sales: findColumnIndex(headers, ['total_sales', 'total sales', 'totalsales', 'sales', 'revenue', 'total_revenue', 'total revenue', 'amount', 'value']),
    current_stock: findColumnIndex(headers, ['current_stock', 'current stock', 'currentstock', 'stock', 'inventory', 'quantity', 'qty', 'stock_level', 'stock level'])
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
        if (key === 'total_sales' || key === 'current_stock') {
          // Remove currency symbols and parse as number
          value = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0
        } else {
          value = value || null
        }
        
        row[key] = value
      } else {
        // Set defaults for missing columns
        if (key === 'total_sales' || key === 'current_stock') {
          row[key] = 0
        } else {
          row[key] = null
        }
      }
    })

    // Only add row if it has product_id and product_name
    if (row.product_id && row.product_name) {
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

