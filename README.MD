# Cyclo.ai - AI-Powered Business Intelligence Platform

Cyclo.ai helps small businesses make smarter decisions using AI. Upload your sales data, inventory, and documents, and get personalized insights, recommendations, and answers to your business questions.

## What Can Cyclo.ai Do For You?

### 📊 **Sales & Inventory Analysis**
- Upload your sales data (CSV files from your POS system)
- Track your best-selling products
- Get alerts for low stock items
- See sales trends and patterns

### 🤖 **AI-Powered Recommendations**
- Get personalized product recommendations
- Learn which products to promote with ads
- Discover which customers to reach out to
- Receive actionable marketing strategies

### 📈 **Business Trends**
- Analyze your sales data to find opportunities
- Get ad campaign suggestions for your top products
- Receive customer outreach recommendations
- Understand what's working and what's not

### 💬 **AI Assistant (Cyclo Bot)**
- Ask questions about your business
- Get answers based on your uploaded documents
- Chat with an AI trained on your business data
- Get instant insights without searching through files

### 📅 **Upcoming Events Planning**
- See nearby events that might affect your business
- Get recommendations for inventory, staffing, and marketing
- Plan ahead for busy periods
- Maximize revenue opportunities

## Getting Started

### Step 1: Sign Up
1. Open the application in your web browser
2. Click "Get Started" or "Sign Up"
3. Create your account with email and password

### Step 2: Complete Your Profile
1. Enter your business name and type
2. Add a description of your business
3. Upload your business documents (PDFs, text files) - these help the AI understand your business better

### Step 3: Upload Your Data

**Upload Sales Data:**
- Go to your Profile page
- Upload CSV files from your POS system
- The system will automatically analyze your sales

**Upload Inventory:**
- Go to the Inventory page
- Upload your inventory CSV file
- Track stock levels and sales

### Step 4: Explore Features

**Overview:** See a summary of your business data

**Inventory:** Manage and track your products

**Recommendations:** Get AI-powered suggestions for your business

**Trends:** Analyze sales data and get marketing recommendations

**Cyclo Bot:** Chat with AI about your business

**Upcoming Events:** Plan for nearby events and opportunities

## What You Need

### For Basic Use:
- A web browser (Chrome, Firefox, Safari, or Edge)
- An internet connection
- Your business data (CSV files from your POS system)

### For Advanced Features:
- Business documents (PDFs, text files) to train the AI
- Inventory data in CSV format
- Sales transaction data in CSV format

## Understanding Your Data

### Sales Data Format
Your CSV file should include columns like:
- Product name or ID
- Price
- Quantity sold
- Customer ID (optional)
- Date of sale

The system is flexible and will recognize common column names automatically.

### Inventory Format
Your CSV file should include:
- Product name
- Product ID
- Total sales (optional)
- Current stock (optional)

## Features Explained

### AI Recommendations
The AI analyzes your sales and inventory data to suggest:
- Which products to promote
- Which products need restocking
- Best-selling items to focus on
- Marketing opportunities

### Trends Analysis
Get insights on:
- Your top-selling products
- Products with growing sales
- Ad campaign ideas for specific products
- Customer outreach strategies

### Cyclo Bot
Ask questions like:
- "What are my best-selling products?"
- "Which products are low in stock?"
- "What should I focus on for marketing?"
- "Tell me about my sales trends"

The bot uses your uploaded documents and data to give personalized answers.

## Getting Help

### Common Questions

**Q: How do I upload my data?**
A: Go to your Profile page and use the file upload sections. The system accepts CSV files for sales and inventory data.

**Q: Can I update my data?**
A: Yes! Just upload new CSV files. The system will update your information.

**Q: Is my data secure?**
A: Yes, your data is stored securely and only you can access it.

**Q: What if I have questions?**
A: Use the Cyclo Bot to ask questions, or check the documentation files in the project.

## Technical Setup (For Developers)

If you're setting up the application for development:

### Requirements
- Node.js 20.19+ or 22.12+
- IBM Cloud account with watsonx.ai access
- Supabase account (for database)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file with:
   ```
   VITE_WATSONX_API_KEY=your_api_key
   VITE_WATSONX_PROJECT_ID=your_project_id
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_PREDICTHQ_API_TOKEN=your_predicthq_token (optional)
   ```

3. **Set up database:**
   - Create a Supabase project
   - Run the migration files in `supabase/migrations/` in order
   - See individual setup guides for details

4. **Start the application:**
   ```bash
   npm run dev:proxy
   ```

### Database Setup

The application requires several database tables. Run these migrations in your Supabase SQL Editor:

1. `001_create_pos_transactions.sql` - For sales data
2. `002_create_documents_vector_store.sql` - For AI document storage
3. `003_update_embeddings_variable_dimensions.sql` - For AI embeddings
4. `004_create_inventory_table.sql` - For inventory data

See the individual documentation files for detailed setup instructions:
- `POS_DATA_IMPORT.md` - Sales data setup
- `RAG_SETUP.md` - AI document features setup
- `CSV_FORMAT.md` - CSV file format guide

## Project Structure

```
Cyclo.ai/
├── src/
│   ├── pages/          # Main application pages
│   ├── components/     # Reusable UI components
│   ├── services/       # Business logic and API services
│   └── utils/          # Helper functions
├── supabase/
│   └── migrations/     # Database setup files
└── public/             # Static files
```

## Support

For technical issues or questions:
- Check the documentation files in the project
- Review the setup guides for specific features
- Contact your development team

---

**Cyclo.ai** - Making business intelligence simple and accessible for everyone.
