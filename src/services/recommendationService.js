/**
 * Product Recommendation Service
 * Uses AI to analyze inventory and POS data to provide product recommendations
 */

import { supabase } from '../supabaseClient'
import watsonxService from './watsonxServiceProxy'

class RecommendationService {
  /**
   * Get low stock products
   * @param {string} userId - User ID
   * @param {number} threshold - Stock threshold (default: 10)
   * @returns {Promise<Array>} Array of low stock products
   */
  async getLowStockProducts(userId, threshold = 10) {
    try {
      const { data, error } = await supabase.rpc('get_low_stock_products', {
        user_uuid: userId,
        stock_threshold: threshold
      })

      if (error) {
        throw new Error(`Failed to get low stock products: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error getting low stock products:', error)
      throw error
    }
  }

  /**
   * Get best selling products
   * @param {string} userId - User ID
   * @param {number} limit - Number of products to return (default: 10)
   * @returns {Promise<Array>} Array of best selling products
   */
  async getBestSellingProducts(userId, limit = 10) {
    try {
      const { data, error } = await supabase.rpc('get_best_selling_products', {
        user_uuid: userId,
        limit_count: limit
      })

      if (error) {
        throw new Error(`Failed to get best selling products: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('Error getting best selling products:', error)
      throw error
    }
  }

  /**
   * Get inventory summary for AI analysis
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Inventory summary
   */
  async getInventorySummary(userId) {
    try {
      const { data: inventory, error: invError } = await supabase
        .from('inventory')
        .select('product_id, product_name, total_sales, current_stock')
        .eq('user_id', userId)

      if (invError) {
        throw new Error(`Failed to get inventory: ${invError.message}`)
      }

      const { data: posData, error: posError } = await supabase
        .from('pos_transactions')
        .select('product_id, product_name, price, amount, date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(100) // Get recent transactions

      if (posError) {
        console.warn('Error getting POS data:', posError)
      }

      // Calculate summary statistics
      const totalProducts = inventory?.length || 0
      const totalSales = inventory?.reduce((sum, item) => sum + (parseFloat(item.total_sales) || 0), 0) || 0
      const lowStockCount = inventory?.filter(item => (item.current_stock || 0) <= 10).length || 0
      const avgSales = totalProducts > 0 ? totalSales / totalProducts : 0

      // Get top products
      const topProducts = inventory
        ?.sort((a, b) => (parseFloat(b.total_sales) || 0) - (parseFloat(a.total_sales) || 0))
        .slice(0, 5) || []

      return {
        totalProducts,
        totalSales,
        lowStockCount,
        avgSales,
        topProducts,
        inventory: inventory || [],
        recentTransactions: posData || []
      }
    } catch (error) {
      console.error('Error getting inventory summary:', error)
      throw error
    }
  }

  /**
   * Generate AI-powered product recommendations
   * @param {string} userId - User ID
   * @param {Object} options - Recommendation options
   * @returns {Promise<string>} AI-generated recommendations
   */
  async generateRecommendations(userId, options = {}) {
    const {
      includeLowStock = true,
      includeBestSellers = true,
      includeGeneral = true
    } = options

    try {
      // Get inventory summary
      const summary = await this.getInventorySummary(userId)

      if (summary.totalProducts === 0) {
        return "No inventory data found. Please upload your inventory CSV file to get recommendations."
      }

      // Build context for AI
      let context = `Inventory Summary:\n`
      context += `- Total Products: ${summary.totalProducts}\n`
      context += `- Total Sales: $${summary.totalSales.toFixed(2)}\n`
      context += `- Average Sales per Product: $${summary.avgSales.toFixed(2)}\n`
      context += `- Low Stock Items: ${summary.lowStockCount}\n\n`

      if (includeLowStock && summary.lowStockCount > 0) {
        const lowStock = await this.getLowStockProducts(userId, 10)
        context += `Low Stock Products (≤10 units):\n`
        lowStock.slice(0, 10).forEach((item, idx) => {
          context += `${idx + 1}. ${item.product_name} (ID: ${item.product_id}) - Stock: ${item.current_stock}, Sales: $${parseFloat(item.total_sales || 0).toFixed(2)}\n`
        })
        context += `\n`
      }

      if (includeBestSellers) {
        const bestSellers = await this.getBestSellingProducts(userId, 10)
        context += `Top Selling Products:\n`
        bestSellers.forEach((item, idx) => {
          context += `${idx + 1}. ${item.product_name} (ID: ${item.product_id}) - Sales: $${parseFloat(item.total_sales || 0).toFixed(2)}, Stock: ${item.current_stock}\n`
        })
        context += `\n`
      }

      // Build AI prompt
      const prompt = `As a business analyst, analyze the following inventory and sales data and provide actionable recommendations:

${context}

Please provide:
1. **Low Stock Recommendations**: Which products need restocking and why
2. **Best Sellers to Double Down On**: Which products should receive more investment/marketing
3. **General Recommendations**: Strategic advice for inventory management and sales optimization

Be specific, actionable, and data-driven in your recommendations.`

      // Generate AI response
      const response = await watsonxService.chatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are an expert business analyst specializing in inventory management and sales optimization. Provide clear, actionable recommendations based on data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model_id: 'ibm/granite-3-8b-instruct',
        parameters: {
          max_tokens: 1500,
          temperature: 0.7
        }
      })

      // Extract response text
      let responseText = ''
      if (response.results && response.results.length > 0) {
        responseText = response.results[0].generated_text || response.results[0].content || ''
      } else if (response.choices && response.choices.length > 0) {
        responseText = response.choices[0].message?.content || ''
      } else if (response.message) {
        responseText = response.message
      } else if (typeof response === 'string') {
        responseText = response
      }

      return responseText || 'Unable to generate recommendations at this time.'
    } catch (error) {
      console.error('Error generating recommendations:', error)
      throw new Error(`Failed to generate recommendations: ${error.message}`)
    }
  }
}

export default new RecommendationService()

