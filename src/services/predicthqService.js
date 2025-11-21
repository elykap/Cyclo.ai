/**
 * PredictHQ Events Intelligence API Service
 * 
 * This service provides methods to interact with PredictHQ API
 * for business impact forecasting and demographic analysis
 * 
 * Documentation: https://docs.predicthq.com/
 */

class PredictHQService {
  constructor() {
    // Get API token from environment variables
    this.apiToken = import.meta.env.VITE_PREDICTHQ_API_TOKEN || '';
    this.baseUrl = 'https://api.predicthq.com/v1';
  }

  /**
   * Make an authenticated request to PredictHQ API
   */
  async makeRequest(endpoint, options = {}) {
    if (!this.apiToken) {
      throw new Error('PredictHQ API token is not configured. Please set VITE_PREDICTHQ_API_TOKEN in your .env file');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Accept': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status}`;
      let errorDetails = null;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorDetails = errorData;
        
        // Log full error for debugging
        console.error('PredictHQ API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
      } catch (parseError) {
        const textError = await response.text().catch(() => '');
        console.error('PredictHQ API Error (non-JSON):', {
          status: response.status,
          statusText: response.statusText,
          body: textError
        });
        errorMessage = `${errorMessage} - ${textError || response.statusText}`;
      }
      
      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = errorDetails;
      throw error;
    }

    return response.json();
  }

  /**
   * Search for events
   * 
   * @param {Object} params - Search parameters
   * @param {string} params.q - Search query (optional)
   * @param {string} params.location_around.origin - Location (lat,lng or address)
   * @param {number} params.location_around.radius - Radius in km
   * @param {string} params.start - Start date (YYYY-MM-DD)
   * @param {string} params.end - End date (YYYY-MM-DD)
   * @param {string} params.category - Event category filter
   * @param {number} params.limit - Number of results (default: 10, max: 200)
   * @param {number} params.offset - Pagination offset
   */
  async searchEvents(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.q) queryParams.append('q', params.q);
    if (params.start) queryParams.append('start.gte', params.start);
    if (params.end) queryParams.append('start.lte', params.end);
    if (params.category) queryParams.append('category', params.category);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    
    // Location filtering - only add if both origin and radius are provided
    if (params.location_around && params.location_around.origin) {
      queryParams.append('location_around.origin', params.location_around.origin);
      if (params.location_around.radius) {
        queryParams.append('location_around.radius', `${params.location_around.radius}km`);
      }
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/events/?${queryString}` : '/events/';
    
    console.log('PredictHQ API Request:', {
      endpoint: `${this.baseUrl}${endpoint}`,
      params: params
    });
    
    return this.makeRequest(endpoint);
  }

  /**
   * Get event by ID
   * 
   * @param {string} eventId - PredictHQ event ID
   */
  async getEvent(eventId) {
    return this.makeRequest(`/events/${eventId}/`);
  }

  /**
   * Get event categories
   */
  async getCategories() {
    return this.makeRequest('/events/categories/');
  }

  /**
   * Get event counts (aggregated statistics)
   * 
   * @param {Object} params - Same as searchEvents params
   */
  async getEventCounts(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.start) queryParams.append('start.gte', params.start);
    if (params.end) queryParams.append('start.lte', params.end);
    if (params.category) queryParams.append('category', params.category);
    
    if (params.location_around) {
      if (params.location_around.origin) {
        queryParams.append('location_around.origin', params.location_around.origin);
      }
      if (params.location_around.radius) {
        queryParams.append('location_around.radius', `${params.location_around.radius}km`);
      }
    }

    const queryString = queryParams.toString();
    return this.makeRequest(`/events/count/?${queryString}`);
  }

  /**
   * Get places (venues, locations)
   * 
   * @param {Object} params - Search parameters
   * @param {string} params.q - Search query
   * @param {string} params.location_around.origin - Location
   * @param {number} params.location_around.radius - Radius in km
   */
  async searchPlaces(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.q) queryParams.append('q', params.q);
    
    if (params.location_around) {
      if (params.location_around.origin) {
        queryParams.append('location_around.origin', params.location_around.origin);
      }
      if (params.location_around.radius) {
        queryParams.append('location_around.radius', `${params.location_around.radius}km`);
      }
    }

    const queryString = queryParams.toString();
    return this.makeRequest(`/places/?${queryString}`);
  }
}

export default new PredictHQService();

