# TeleBot Admin Dashboard

A React-based admin dashboard for managing TeleBot data, featuring Google Maps integration for location-based content.

## Features

- 🗺️ Google Maps address search with autocomplete
- 📱 Responsive design for desktop and mobile
- 🔒 Secure authentication with AWS Cognito
- 📊 Data management interface
- 🌙 Dark-mode UI

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Google Maps API key with Places API enabled
- AWS Cognito user pool for authentication

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/TeleBot-DB.git
   cd TeleBot-DB/TeleAdminDB/TeleBot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Add your API keys and configuration values to the `.env` file.

5. Start the development server:
   ```bash
   npm run dev
   ```

## Testing

### Google Maps API Testing

Test your Google Maps API key configuration:

```bash
npm run test:maps
```

This will create a test HTML file at `test/maps-test.html` that you can view in a browser:

```bash
npm run serve:test
```

### Unit Testing

Run unit tests with Jest:

```bash
npm test
```

### Run All Tests

To run all tests and checks in sequence:

```bash
chmod +x scripts/run-all-tests.sh
./scripts/run-all-tests.sh
```

## Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. The build output will be in the `dist` directory, which can be deployed to any static hosting service.

3. For AWS deployment, use the provided `deploy.sh` script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Project Structure

```
src/
├── components/       # Reusable components
│   ├── ui/           # UI components
│   └── GoogleMapsAutocomplete/  # Google Maps integration
├── lib/              # Utilities and API clients
├── screens/          # Main application screens
├── types/            # TypeScript type definitions
└── App.tsx           # Main application component
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key |
| `VITE_COGNITO_CLIENT_ID` | AWS Cognito client ID |
| `VITE_COGNITO_DOMAIN` | AWS Cognito domain URL |

## Documentation

- [Quick Start Guide](./QUICKSTART.md) - Get up and running quickly
- [Environment Guide](./ENVIRONMENTS.md) - Managing different environments
- [Component Docs](./src/components/GoogleMapsAutocomplete/README.md) - Using the GoogleMapsAutocomplete component

## License

This project is licensed under the MIT License - see the LICENSE file for details. 