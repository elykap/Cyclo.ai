import { supabase } from '../supabaseClient'
import watsonxService from './watsonxServiceProxy'

/**
 * Trends Service
 * Analyzes POS transaction data to provide:
 * - Ad campaign recommendations for high-selling products
 * - Customer outreach suggestions based on purchase patterns
 */
class TrendsService {
  /**
   * Get top selling products from POS data
   */
  async getTopSellingProducts(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('pos_transactions')
        .select('product_name, product_id, price, amount')
        .eq('user_id', userId)
        .not('product_name', 'is', null)

      if (error) throw error

      // Aggregate by product
      const productMap = {}
      data.forEach(transaction => {
        const productName = transaction.product_name || 'Unknown'
        const productId = transaction.product_id || 'unknown'
        const revenue = parseFloat(transaction.price || 0) * parseFloat(transaction.amount || 0)
        const quantity = parseFloat(transaction.amount || 0)

        if (!productMap[productName]) {
          productMap[productName] = {
            product_id: productId,
            product_name: productName,
            total_revenue: 0,
            total_quantity: 0,
            transaction_count: 0,
            avg_price: parseFloat(transaction.price || 0)
          }
        }

        productMap[productName].total_revenue += revenue
        productMap[productName].total_quantity += quantity
        productMap[productName].transaction_count += 1
      })

      // Convert to array and sort by revenue
      const products = Object.values(productMap)
        .map(p => ({
          ...p,
          avg_price: p.total_revenue / p.total_quantity || p.avg_price
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit)

      return products
    } catch (error) {
      console.error('Error getting top selling products:', error)
      return []
    }
  }

  /**
   * Get customer purchase patterns
   */
  async getCustomerPatterns(userId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('pos_transactions')
        .select('customer_id, product_name, product_id, price, amount, date')
        .eq('user_id', userId)
        .not('customer_id', 'is', null)
        .order('date', { ascending: false })

      if (error) throw error

      // Group by customer
      const customerMap = {}
      data.forEach(transaction => {
        const customerId = transaction.customer_id
        if (!customerMap[customerId]) {
          customerMap[customerId] = {
            customer_id: customerId,
            products: [],
            total_spent: 0,
            transaction_count: 0,
            last_purchase: null,
            favorite_products: {}
          }
        }

        const productName = transaction.product_name || 'Unknown'
        const revenue = parseFloat(transaction.price || 0) * parseFloat(transaction.amount || 0)

        customerMap[customerId].total_spent += revenue
        customerMap[customerId].transaction_count += 1

        if (!customerMap[customerId].favorite_products[productName]) {
          customerMap[customerId].favorite_products[productName] = 0
        }
        customerMap[customerId].favorite_products[productName] += parseFloat(transaction.amount || 0)

        if (!customerMap[customerId].last_purchase || 
            new Date(transaction.date) > new Date(customerMap[customerId].last_purchase)) {
          customerMap[customerId].last_purchase = transaction.date
        }
      })

      // Convert to array and enrich with favorite products
      const customers = Object.values(customerMap).map(customer => {
        const favoriteProduct = Object.entries(customer.favorite_products)
          .sort((a, b) => b[1] - a[1])[0]

        return {
          ...customer,
          favorite_product: favoriteProduct ? favoriteProduct[0] : null,
          favorite_product_quantity: favoriteProduct ? favoriteProduct[1] : 0,
          days_since_last_purchase: customer.last_purchase 
            ? Math.floor((new Date() - new Date(customer.last_purchase)) / (1000 * 60 * 60 * 24))
            : null
        }
      })

      // Sort by total spent
      return customers
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, limit)
    } catch (error) {
      console.error('Error getting customer patterns:', error)
      return []
    }
  }

  /**
   * Get trending products (recent growth)
   */
  async getTrendingProducts(userId, days = 30) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const { data: recent, error: recentError } = await supabase
        .from('pos_transactions')
        .select('product_name, price, amount')
        .eq('user_id', userId)
        .gte('date', cutoffDate.toISOString())
        .not('product_name', 'is', null)

      if (recentError) throw recentError

      const { data: older, error: olderError } = await supabase
        .from('pos_transactions')
        .select('product_name, price, amount')
        .eq('user_id', userId)
        .lt('date', cutoffDate.toISOString())
        .not('product_name', 'is', null)

      if (olderError) throw olderError

      // Calculate recent sales
      const recentMap = {}
      recent.forEach(t => {
        const name = t.product_name
        if (!recentMap[name]) recentMap[name] = { revenue: 0, quantity: 0 }
        recentMap[name].revenue += parseFloat(t.price || 0) * parseFloat(t.amount || 0)
        recentMap[name].quantity += parseFloat(t.amount || 0)
      })

      // Calculate older sales
      const olderMap = {}
      older.forEach(t => {
        const name = t.product_name
        if (!olderMap[name]) olderMap[name] = { revenue: 0, quantity: 0 }
        olderMap[name].revenue += parseFloat(t.price || 0) * parseFloat(t.amount || 0)
        olderMap[name].quantity += parseFloat(t.amount || 0)
      })

      // Find trending (products with growth)
      const trending = []
      Object.keys(recentMap).forEach(productName => {
        const recentData = recentMap[productName]
        const olderData = olderMap[productName] || { revenue: 0, quantity: 0 }
        
        if (recentData.revenue > 0) {
          const growth = olderData.revenue > 0 
            ? ((recentData.revenue - olderData.revenue) / olderData.revenue) * 100
            : 100

          trending.push({
            product_name: productName,
            recent_revenue: recentData.revenue,
            recent_quantity: recentData.quantity,
            previous_revenue: olderData.revenue,
            growth_percentage: growth
          })
        }
      })

      return trending
        .sort((a, b) => b.growth_percentage - a.growth_percentage)
        .slice(0, 10)
    } catch (error) {
      console.error('Error getting trending products:', error)
      return []
    }
  }

  /**
   * Generate AI-powered ad campaign recommendations
   */
  async generateAdCampaignRecommendations(userId, topProducts, trendingProducts) {
    try {
      const prompt = `You are a marketing strategist analyzing sales data to create ad campaign recommendations.

TOP SELLING PRODUCTS:
${JSON.stringify(topProducts.slice(0, 5).map(p => ({
  product: p.product_name,
  revenue: `$${p.total_revenue.toFixed(2)}`,
  quantity: p.total_quantity,
  transactions: p.transaction_count
})), null, 2)}

TRENDING PRODUCTS (Recent Growth):
${JSON.stringify(trendingProducts.slice(0, 5).map(p => ({
  product: p.product_name,
  growth: `${p.growth_percentage.toFixed(1)}%`,
  recent_revenue: `$${p.recent_revenue.toFixed(2)}`
})), null, 2)}

Create specific, actionable ad campaign recommendations. Format your response as follows:

For each top product, create a section with:

**Product Name: [Product Name]**

- **Campaign Strategy**: [Type of campaign - social media, email, search ads, etc.]
- **Target Audience**: [Who should see these ads - demographics, interests, behaviors]
- **Key Messaging**: [What to highlight in the ads - unique selling points, benefits]
- **Budget Recommendation**: [Suggested ad spend allocation - specific dollar amount or percentage]
- **Expected ROI**: [Potential return on investment - estimated revenue increase]

Use clear section headers, bullet points, and specific numbers. Make it easy to scan and implement.`

      const response = await watsonxService.chatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are an expert digital marketing strategist specializing in e-commerce and retail advertising. You create data-driven, actionable ad campaign recommendations that help businesses maximize ROI on their marketing spend. Your recommendations are specific, practical, and based on sales performance data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model_id: 'ibm/granite-3-8b-instruct',
        parameters: {
          max_tokens: 2000,
          temperature: 0.7
        }
      })

      let recommendations = ''
      if (response.results && response.results.length > 0) {
        recommendations = response.results[0].generated_text || 
                         response.results[0].content || ''
      } else if (response.choices && response.choices.length > 0) {
        recommendations = response.choices[0].message?.content || ''
      } else if (response.message) {
        recommendations = response.message
      } else if (typeof response === 'string') {
        recommendations = response
      }

      return recommendations
    } catch (error) {
      console.error('Error generating ad campaign recommendations:', error)
      return 'Unable to generate recommendations at this time. Please try again later.'
    }
  }

  /**
   * Generate customer outreach recommendations
   */
  async generateOutreachRecommendations(userId, customerPatterns) {
    try {
      const topCustomers = customerPatterns.slice(0, 10)
      const highValueCustomers = topCustomers.filter(c => c.total_spent > 0)
      const inactiveCustomers = customerPatterns.filter(c => 
        c.days_since_last_purchase && c.days_since_last_purchase > 30
      ).slice(0, 10)

      const prompt = `You are a customer relationship strategist analyzing purchase patterns to create targeted outreach recommendations.

HIGH-VALUE CUSTOMERS (Top 10 by spend):
${JSON.stringify(highValueCustomers.map(c => ({
  customer_id: c.customer_id,
  total_spent: `$${c.total_spent.toFixed(2)}`,
  transactions: c.transaction_count,
  favorite_product: c.favorite_product,
  days_since_last_purchase: c.days_since_last_purchase
})), null, 2)}

INACTIVE CUSTOMERS (No purchase in 30+ days):
${JSON.stringify(inactiveCustomers.map(c => ({
  customer_id: c.customer_id,
  last_spent: `$${c.total_spent.toFixed(2)}`,
  favorite_product: c.favorite_product,
  days_inactive: c.days_since_last_purchase
})), null, 2)}

Create specific outreach recommendations. Format your response as follows:

**High-Value Customer Retention**

- **VIP Program**: [Specific program suggestions - tiers, benefits, requirements]
- **Personalized Offers**: [Custom offers based on favorite products - specific product recommendations]
- **Loyalty Rewards**: [Incentive strategies - points, discounts, exclusive access]

**Win-Back Campaigns**

- **Re-engagement Strategy**: [How to reach inactive customers - channels, timing, messaging]
- **Special Offers**: [Specific offers to bring them back - discounts, bundles, free shipping]
- **Product Recommendations**: [Products to suggest based on past purchases - specific items]

**Cross-Sell Opportunities**

- **Recommended Products**: [Products to suggest to existing customers - specific items with reasoning]
- **Bundle Deals**: [Suggested product bundles - combinations and pricing]
- **Upsell Strategies**: [How to increase order value - add-ons, upgrades, quantity incentives]

Use clear section headers, bullet points, and be specific with product names and numbers. Make it actionable and easy to implement.`

      const response = await watsonxService.chatCompletion({
        messages: [
          {
            role: 'system',
            content: 'You are an expert in customer relationship management and retention marketing. You create personalized outreach strategies that help businesses re-engage customers, increase lifetime value, and reduce churn. Your recommendations are specific, data-driven, and actionable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model_id: 'ibm/granite-3-8b-instruct',
        parameters: {
          max_tokens: 2000,
          temperature: 0.7
        }
      })

      let recommendations = ''
      if (response.results && response.results.length > 0) {
        recommendations = response.results[0].generated_text || 
                         response.results[0].content || ''
      } else if (response.choices && response.choices.length > 0) {
        recommendations = response.choices[0].message?.content || ''
      } else if (response.message) {
        recommendations = response.message
      } else if (typeof response === 'string') {
        recommendations = response
      }

      return recommendations
    } catch (error) {
      console.error('Error generating outreach recommendations:', error)
      return 'Unable to generate recommendations at this time. Please try again later.'
    }
  }
}

export default new TrendsService()

