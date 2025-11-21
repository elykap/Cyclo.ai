# Cyclo.ai – IBM watsonx.ai Integration

Cyclo.ai already has its own product experience, so this repository focuses on the **shared LLM infrastructure** only.  
You get a production-ready IBM watsonx.ai service + proxy that any page, route or API inside Cyclo.ai can consume.

## Highlights

- 🧠 **Central LLM service** (`src/services/watsonxServiceProxy.js`) with helpers for text, chat, embeddings, models and more.
- 🔐 **Server-side proxy** (`server.js`) handles IAM auth + CORS, so the browser never touches IBM directly.
- ⚙️ **Config in one place** (`src/config/watsonx.config.js`) for regions, versions and environment variables.
- 🧩 **UI-free landing page** explaining how to wire the service into any feature—no forced chat/demo pages.
- ⚡ **Vite + React 19** baseline; ready to drop into any larger monorepo or micro-frontend setup.

## IBM watsonx.ai API Reference

This starter uses the official [IBM watsonx.ai API](https://cloud.ibm.com/apidocs/watsonx-ai) and exposes convenient helpers for:

- `generateText` / `chatCompletion` / `generateTextStream`
- `generateEmbeddings`, `tokenize`
- `listFoundationModels`, `listTrainings`, `createTraining`, etc.

## Getting Started

### Prerequisites

- Node.js **20.19+** or **22.12+** (matching Vite’s requirement)
- IBM Cloud account with watsonx.ai access
- IBM Cloud API Key
- watsonx.ai Project ID

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Cyclo.ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the root directory (a `.env.example` file is provided as a template):

   ```bash
   # IBM watsonx.ai Configuration
   VITE_WATSONX_API_KEY=your_ibm_cloud_api_key_here
   VITE_WATSONX_PROJECT_ID=your_project_id_here
   VITE_WATSONX_SPACE_ID=your_space_id_here  # Optional
   
   # PredictHQ Events Intelligence API (Optional - for demographics/events features)
   VITE_PREDICTHQ_API_TOKEN=your_predicthq_api_token_here
   ```

   **How to get your credentials:**

   - **IBM Cloud API Key**: Visit [IBM Cloud API Keys](https://cloud.ibm.com/iam/apikeys) and create a new API key
   - **Project ID**: Found in your watsonx.ai project settings
   - **Space ID**: (Optional) Found in your deployment space settings
   - **PredictHQ API Token**: Sign up at [PredictHQ](https://www.predicthq.com/) and get your API token from the dashboard (optional, for events/demographics features)

4. **Start Vite + Proxy together**
   ```bash
   npm run dev:proxy
   ```

5. **Open your browser**
   Vite will print the actual port (5173/5174/5175…). Visit the shown URL.

## Project Structure

```
Cyclo.ai/
├── src/
│   ├── config/
│   │   └── watsonx.config.js     # API configuration
│   ├── services/
│   │   └── watsonxServiceProxy.js # The shared LLM helper
│   ├── App.jsx                    # Main application component
│   ├── index.css                  # Global styles
│   └── main.jsx                   # Application entry point
├── server.js                      # Local proxy (IAM + CORS)
├── .env.example                   # Environment variables template
├── package.json                   # Project dependencies
└── README.md                      # This file
```

## Using the shared service

Import the service anywhere (pages, hooks, API routes, workers) and call the helper you need:

```ts
import watsonxService from '@/services/watsonxServiceProxy'

async function summarize(text) {
  const { results } = await watsonxService.generateText({
    model_id: 'ibm/granite-3-8b-instruct',
    input: `Summarise:\n${text}`,
    parameters: { max_new_tokens: 200, temperature: 0.5 }
  })

  return results?.[0]?.generated_text ?? ''
}
```

Available helpers today:

| Method | Description |
| --- | --- |
| `generateText` | Single-shot completion |
| `generateTextStream` | (Browser-safe) SSE streaming |
| `chatCompletion` | Multi-turn chat format |
| `generateEmbeddings` | Vector embeddings |
| `tokenize` | Token breakdown |
| `listFoundationModels` | Metadata for available models |
| `createTraining`, `listTrainings`, `listDeployments` | Advanced lifecycle helpers |

## Available Models

The default model (`ibm/granite-3-8b-instruct`) is configured for the Dallas region.  
You can switch to any supported model listed in the [IBM catalog](https://www.ibm.com/docs/en/watsonx-as-a-service/latest?topic=models-supported-foundation-ai).

## Configuration

### Changing the Default Region

Edit `src/config/watsonx.config.js` to change the default region:

```javascript
// Available regions: dallas, frankfurt, london, tokyo, sydney, toronto, mumbai
defaultRegion: 'dallas'
```

### Customizing Generation Parameters

Modify parameters in `src/services/watsonxServiceProxy.js`:

```javascript
parameters: {
  max_new_tokens: 200,    // Maximum tokens to generate
  temperature: 0.7,       // Randomness (0.0 - 2.0)
  top_p: 1,              // Nucleus sampling
  top_k: 50              // Top-k sampling
}
```

## Security Notes

⚠️ **Important**: This is a demo application. In production:

1. **Never expose API keys in client-side code**
2. Implement a backend proxy to handle IBM Cloud authentication
3. Use environment variables only for development
4. Implement proper rate limiting and error handling
5. Add authentication and authorization to your application

## API Reference

The application uses the following IBM watsonx.ai API endpoints:

- `POST /ml/v1/text/generation` - Generate text
- `POST /ml/v1/text/chat` - Chat completions
- `POST /ml/v1/text/embeddings` - Generate embeddings
- `POST /ml/v1/text/tokenization` - Tokenize text
- `GET /ml/v1/foundation_model_specs` - List models

For complete API documentation, visit: [IBM watsonx.ai API Documentation](https://cloud.ibm.com/apidocs/watsonx-ai)

## Scripts

- `npm run dev` - Start Vite only (proxy not included)
- `npm run server` - Start proxy only
- `npm run dev:proxy` - Start Vite + proxy together (recommended)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Technologies Used

- **React 19** - UI framework
- **Vite** - Build tool and development server
- **IBM watsonx.ai API** - AI/ML capabilities
- **CSS3** - Modern styling with gradients and animations

## Troubleshooting

### Authentication Errors

If you see authentication errors:
1. Verify your API key is correct
2. Check that your API key has watsonx.ai permissions
3. Ensure your Project ID is valid

### CORS Issues

If you encounter CORS errors:
- Ensure you are using `npm run dev:proxy`
- Confirm the proxy port (default `3002`) matches `watsonxServiceProxy.js`

### Model Not Available

If a model isn't working:
- Check if the model is available in your region
- Verify your account has access to the model
- Try switching to a different model

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - See LICENSE file for details

## Resources

- [IBM watsonx.ai Documentation](https://www.ibm.com/docs/en/watsonx-as-a-service)
- [IBM watsonx.ai API Docs](https://cloud.ibm.com/apidocs/watsonx-ai)
- [IBM Cloud](https://cloud.ibm.com)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)

## Support

For issues and questions:
- IBM watsonx.ai: [IBM Support](https://www.ibm.com/mysupport)
- Project issues: Open an issue on GitHub

---

Built with ❤️ using IBM watsonx.ai