# Art Product Generator

An AI-powered web app that generates product visualizations in traditional Indian art styles using Google Gemini.

## Features

- **12 Indian Art Forms**: Blue Pottery, Cheriyal, Gond, Hand Sculpting, Kalamkari, Kavad, Madurkathi, Miniature, Nirmal, Pattachitra, Tholu Bommalata, Warli
- **AI Image Generation**: Creates up to 4 product visualizations per request
- **Reference Image Support**: Upload product reference for better results
- **Iterative Refinement**: Modify generated images with text prompts
- **Fully Dockerized**: Single command deployment

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Setup

1. **Clone and configure**

    ```bash
    cd art-product-generator
    cp .env.example .env
    # Edit .env and add your GEMINI_API_KEY
    ```

2. **Add reference images**

    Place 2-6 reference images for each art form in:

    ```text
    assets/art_forms/[art-form-key]/
    ```

    Images are loaded dynamically at startup. Supported formats: jpg, jpeg, png, webp.
    See [assets/art_forms/README.md](assets/art_forms/README.md) for details.

3. **Start the application**

    ```bash
    docker compose up --build
    ```

4. **Access the app**
    - Frontend: <http://localhost:3000>
    - API: <http://localhost:5000>

## API Endpoints

### Art Forms

- `GET /api/art-forms` - List all art forms with their reference images
- `GET /api/art-forms/:key` - Get art form details

### Generation

- `POST /api/generate` - Generate new product images
  - Body (form-data):
    - `artFormKey` (required): Art form identifier (e.g., `warli`, `gond`, `bluepottery`)
    - `productType` (required): Product name
    - `additionalInstructions` (optional): Extra AI instructions
    - `referenceImage` (optional): Product reference image file

- `POST /api/generate/modify/:sessionId` - Modify existing images
  - Body (JSON):
    - `modificationPrompt`: Description of changes

- `GET /api/generate/session/:sessionId` - Get session details

## Development

### Without Docker

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start server
cd server
pnpm install
pnpm run dev

# Terminal 3: Start client
cd client
pnpm install
pnpm run dev
```

### Adding New Art Forms

1. Create a directory in [assets/art_forms/](assets/art_forms/) named after your art form key
2. Add 2-6 reference images (jpg, png, webp)
3. Add entry in [server/src/config/artForms.js](server/src/config/artForms.js):

```javascript
newartform: {
  name: 'New Art Form',
  description: 'Description of the art form',
  stylePrompt: 'Detailed style description for AI',
},
```

Reference images are automatically discovered from the assets directory at startup.
