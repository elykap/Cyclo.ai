/**
 * IBM watsonx.ai Configuration
 * 
 * Configure your watsonx.ai endpoint and credentials here.
 * Base URLs vary by region - choose the one closest to you.
 */

export const WATSONX_CONFIG = {
  // Region-specific base URLs
  endpoints: {
    dallas: 'https://us-south.ml.cloud.ibm.com',
    frankfurt: 'https://eu-de.ml.cloud.ibm.com',
    london: 'https://eu-gb.ml.cloud.ibm.com',
    tokyo: 'https://jp-tok.ml.cloud.ibm.com',
    sydney: 'https://au-syd.ml.cloud.ibm.com',
    toronto: 'https://ca-tor.ml.cloud.ibm.com',
    mumbai: 'https://ap-south-1.aws.wxai.ibm.com'
  },

  // Prompt/Notebooks/Vector indexes endpoints
  dataEndpoints: {
    dallas: 'https://api.dataplatform.cloud.ibm.com/wx',
    frankfurt: 'https://api.eu-de.dataplatform.cloud.ibm.com/wx',
    london: 'https://api.eu-gb.dataplatform.cloud.ibm.com/wx',
    tokyo: 'https://api.jp-tok.dataplatform.cloud.ibm.com/wx',
    sydney: 'https://api.au-syd.dai.cloud.ibm.com/wx',
    toronto: 'https://api.ca-tor.dai.cloud.ibm.com/wx',
    mumbai: 'https://api.ap-south-1.aws.data.ibm.com/wx'
  },

  // Default region (change this to your preferred region)
  defaultRegion: 'dallas',

  // API version date
  version: '2024-03-14',

  // Get the active base URL
  getBaseUrl() {
    return this.endpoints[this.defaultRegion];
  },

  // Get the data platform base URL
  getDataUrl() {
    return this.dataEndpoints[this.defaultRegion];
  }
};

// Environment variables for sensitive data
export const getWatsonxCredentials = () => {
  return {
    apiKey: import.meta.env.VITE_WATSONX_API_KEY || '',
    projectId: import.meta.env.VITE_WATSONX_PROJECT_ID || '',
    spaceId: import.meta.env.VITE_WATSONX_SPACE_ID || ''
  };
};

