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
      let errorMessage = errorData.message || errorData.error || `API request failed: ${response.status}`;
      
      // Provide helpful error message for model not found
      if (errorData.errors && Array.isArray(errorData.errors)) {
        const modelError = errorData.errors.find(err => err.code === 'model_not_supported');
        if (modelError) {
          errorMessage = `Embedding model not found: ${modelError.message}. Please check available models at https://cloud.ibm.com/apidocs/watsonx-ai#text-embeddings or set VITE_WATSONX_EMBEDDING_MODEL in your .env file.`;
        }
      }
      
      throw new Error(errorMessage);
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
   * List available foundation models (including embedding models)
   */
  async listAvailableModels(filters = {}) {
    const queryParams = new URLSearchParams({
      version: WATSONX_CONFIG.version
    });
    
    if (filters.function_embedding) {
      queryParams.append('filters', 'function_embedding');
    }

    return this.makeRequest(
      `/ml/v1/foundation_model_specs?${queryParams.toString()}`,
      {
        method: 'GET'
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

    // Default embedding model - can be overridden via params or env var
    // Supported models per IBM docs:
    // - ibm/slate-125m-english-rtrvr (768 dims, better performance)
    // - ibm/slate-30m-english-rtrvr (384 dims, faster)
    // - sentence-transformers/all-minilm-l6-v2 (384 dims)
    // - intfloat/multilingual-e5-large (1024 dims, multilingual)
    const defaultModel = import.meta.env.VITE_WATSONX_EMBEDDING_MODEL || 'ibm/slate-125m-english-rtrvr';
    const modelId = params.model_id || defaultModel;

    const body = {
      model_id: modelId,
      inputs: Array.isArray(params.inputs) ? params.inputs : [params.inputs],
      project_id: projectId
    };

    // Try the requested model, with automatic fallback to other supported models
    const fallbackModels = [
      'ibm/slate-125m-english-rtrvr',  // 768 dims - best performance
      'ibm/slate-30m-english-rtrvr',   // 384 dims - faster
      'sentence-transformers/all-minilm-l6-v2',  // 384 dims - open source
      'intfloat/multilingual-e5-large'  // 1024 dims - multilingual
    ];

    let lastError = null;
    const modelsToTry = modelId === defaultModel 
      ? fallbackModels 
      : [modelId, ...fallbackModels.filter(m => m !== modelId)];

    console.log(`[Embeddings] Trying ${modelsToTry.length} embedding models:`, modelsToTry);

    for (let i = 0; i < modelsToTry.length; i++) {
      const tryModel = modelsToTry[i];
      try {
        const tryBody = { ...body, model_id: tryModel };
        console.log(`[Embeddings] Attempt ${i + 1}/${modelsToTry.length}: Trying model "${tryModel}"`);
        const response = await this.makeRequest(
          `/ml/v1/text/embeddings?version=${WATSONX_CONFIG.version}`,
          {
            method: 'POST',
            body: JSON.stringify(tryBody)
          }
        );
        if (tryModel !== modelId) {
          console.log(`[Embeddings] ✓ Successfully using fallback model: ${tryModel} (original: ${modelId} was not available)`);
        } else {
          console.log(`[Embeddings] ✓ Successfully using requested model: ${tryModel}`);
        }
        return response;
      } catch (error) {
        lastError = error;
        // Check for various model not found error patterns
        const isModelNotFound = error.message && (
          error.message.includes('model_not_supported') ||
          error.message.includes('was not found') ||
          error.message.includes('not available') ||
          error.message.includes('unsupported') ||
          error.message.includes('deprecated') ||
          error.message.includes('removed')
        );
        
        if (isModelNotFound) {
          const attemptNum = modelsToTry.indexOf(tryModel) + 1;
          console.warn(`[Embeddings] Model "${tryModel}" not available (${attemptNum}/${modelsToTry.length}), trying next...`);
          continue;
        }
        // If it's a different error (not model-related), throw it immediately
        throw error;
      }
    }

    // All models failed
    throw new Error(
      `None of the embedding models are available in your project. ` +
      `Last error: ${lastError?.message || 'Unknown error'}. ` +
      `Please check your Watson AI project settings to ensure embedding models are enabled. ` +
      `You can list available models using: listAvailableModels({ function_embedding: true })`
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

