/**
 * IBM watsonx.ai Service (Proxy Mode)
 * 
 * This service uses a local proxy server to avoid CORS issues.
 * The proxy server handles IBM Cloud IAM authentication and forwards requests to watsonx.ai.
 */

import { WATSONX_CONFIG, getWatsonxCredentials } from '../config/watsonx.config';

class WatsonxServiceProxy {
  constructor() {
    this.credentials = getWatsonxCredentials();
    this.baseUrl = WATSONX_CONFIG.getBaseUrl();
    // Hardcode for debugging to ensure it hits the right port
    this.proxyUrl = 'http://localhost:3002'; 
    console.log('WatsonxServiceProxy initialized with URL:', this.proxyUrl);
  }

  /**
   * Get IBM Cloud IAM access token via proxy
   */
  async getAccessToken() {
    const response = await fetch(`${this.proxyUrl}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to authenticate with IBM Cloud');
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Make an authenticated request to watsonx.ai API via proxy
   */
  async makeRequest(endpoint, options = {}) {
    const response = await fetch(`${this.proxyUrl}/api/watsonx${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `API request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * List available foundation models
   */
  async listFoundationModels() {
    return this.makeRequest(`/ml/v1/foundation_model_specs?version=${WATSONX_CONFIG.version}`);
  }

  /**
   * Generate text using a foundation model
   */
  async generateText(params) {
    const { projectId } = this.credentials;
    
    if (!projectId) {
      throw new Error('Project ID is not configured');
    }

    const body = {
      model_id: params.model_id || 'ibm/granite-3-8b-instruct',
      input: params.input,
      parameters: params.parameters || {
        max_new_tokens: 200,
        temperature: 0.7,
        top_p: 1,
        top_k: 50
      },
      project_id: projectId
    };

    return this.makeRequest(
      `/ml/v1/text/generation?version=${WATSONX_CONFIG.version}`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  }

  /**
   * Generate text with streaming response
   */
  async generateTextStream(params, onChunk) {
    const { projectId } = this.credentials;

    if (!projectId) {
      throw new Error('Project ID is not configured');
    }

    const body = {
      model_id: params.model_id || 'ibm/granite-3-8b-instruct',
      input: params.input,
      parameters: params.parameters || {
        max_new_tokens: 200,
        temperature: 0.7
      },
      project_id: projectId
    };

    // Get token first
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/ml/v1/text/generation_stream?version=${WATSONX_CONFIG.version}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      throw new Error(`Streaming request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonStr = line.substring(5).trim();
          if (jsonStr !== '[DONE]') {
            try {
              const data = JSON.parse(jsonStr);
              onChunk(data);
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    }
  }

  /**
   * Generate chat completion
   */
  async chatCompletion(params) {
    const { projectId } = this.credentials;
    
    if (!projectId) {
      throw new Error('Project ID is not configured');
    }

    const body = {
      model_id: params.model_id || 'ibm/granite-3-8b-instruct',
      messages: params.messages,
      parameters: params.parameters || {
        max_tokens: 500,
        temperature: 0.7
      },
      project_id: projectId
    };

    return this.makeRequest(
      `/ml/v1/text/chat?version=${WATSONX_CONFIG.version}`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  }

  /**
   * Generate text embeddings
   */
  async generateEmbeddings(params) {
    const { projectId } = this.credentials;
    
    if (!projectId) {
      throw new Error('Project ID is not configured');
    }

    const body = {
      model_id: params.model_id || 'ibm/slate-125m-english-rtrvr',
      inputs: Array.isArray(params.inputs) ? params.inputs : [params.inputs],
      project_id: projectId
    };

    return this.makeRequest(
      `/ml/v1/text/embeddings?version=${WATSONX_CONFIG.version}`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  }

  /**
   * Tokenize text
   */
  async tokenize(params) {
    const { projectId } = this.credentials;
    
    if (!projectId) {
      throw new Error('Project ID is not configured');
    }

    const body = {
      model_id: params.model_id || 'ibm/granite-13b-chat-v2',
      input: params.input,
      parameters: params.parameters || {},
      project_id: projectId
    };

    return this.makeRequest(
      `/ml/v1/text/tokenization?version=${WATSONX_CONFIG.version}`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  }

  /**
   * List deployments
   */
  async listDeployments() {
    const { spaceId } = this.credentials;
    
    const params = new URLSearchParams({
      version: WATSONX_CONFIG.version
    });

    if (spaceId) {
      params.append('space_id', spaceId);
    }

    return this.makeRequest(`/ml/v4/deployments?${params.toString()}`);
  }

  /**
   * Create a new training job
   */
  async createTraining(params) {
    const { projectId } = this.credentials;
    
    if (!projectId) {
      throw new Error('Project ID is not configured');
    }

    const body = {
      ...params,
      project_id: projectId
    };

    return this.makeRequest(
      `/ml/v4/trainings?version=${WATSONX_CONFIG.version}`,
      {
        method: 'POST',
        body: JSON.stringify(body)
      }
    );
  }

  /**
   * List training jobs
   */
  async listTrainings() {
    const { projectId } = this.credentials;
    
    const params = new URLSearchParams({
      version: WATSONX_CONFIG.version
    });

    if (projectId) {
      params.append('project_id', projectId);
    }

    return this.makeRequest(`/ml/v4/trainings?${params.toString()}`);
  }
}

export default new WatsonxServiceProxy();

