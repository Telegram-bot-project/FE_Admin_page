# TeleBot Admin Dashboard

A React-based admin dashboard for managing TeleBot data, featuring Google Maps integration for location-based content.

## Features

- 🗺️ Google Maps address search with autocomplete
- 📱 Responsive design for desktop and mobile
- 🔒 Secure authentication with AWS Cognito
- 📊 Data management interface
- 🌙 Dark-mode UI
- 🎟️ Multi-tier ticket management
- 💰 Category-specific pricing models
- 📅 Complete event scheduling with start/end times
- ✅ Comprehensive data validation

## Recent Updates

- **Category-Specific Pricing**: 
  - Events & Entertainment: Multi-tier ticket system with unlimited price options
  - Food & Beverage and Accommodation: Price range model for minimum/maximum pricing
- **End Time Enhancement**: Improved time picker for both start and end times
- **Format Validation**: Improved validation for dates, times, and required fields
- **Category-specific Rules**: Different validation requirements based on item category

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

## Usage Guide

### Creating Items by Category

#### Events & Entertainment
- Require start date/time and end date/time
- Support multi-tier ticket pricing:
  - Add multiple ticket types (VIP, General Admission, etc.)
  - Set price and currency for each ticket
  - Include optional ticket descriptions

#### Food & Beverage and Accommodation
- Use price range model:
  - Set minimum and maximum prices
  - Select currency
  - Prices display as a range (e.g., "$10-$50")

#### FAQ Items
- Question (name field) and Answer (description field) required
- No pricing, date, or location information needed

#### SOS Assistants
- Require phone number in description field
- Require address for location-based assistance
- No pricing information needed

### Format Requirements

- **Dates**: Must use mm/dd/yyyy format (e.g., 12/31/2023)
- **Times**: Must use hh:mm AM/PM format (e.g., 9:30 AM)
- **Address**: Required for Event, Entertainment, Accommodation, Food & Beverage, and SOS assistants
- **Phone Numbers**: Required for SOS assistants in the format "Phone number: +X-XXX-XXX-XXXX"

## Technical Notes

### Category-Specific Data Models

- **Event & Entertainment**: 
  ```json
  {
    "tickets": [
      {
        "id": "ticket-1",
        "name": "VIP Access",
        "price": "100",
        "currency": "USD",
        "description": "Front row seating"
      },
      {
        "id": "ticket-2",
        "name": "General Admission",
        "price": "50",
        "currency": "USD",
        "description": ""
      }
    ]
  }
  ```

- **Food & Beverage / Accommodation**:
  ```json
  {
    "priceRange": {
      "min": "10",
      "max": "50",
      "currency": "USD"
    }
  }
  ```

### Validation Rules

- **Events & Entertainment**: Require end date/time and at least one ticket or "Free"
- **Food & Beverage / Accommodation**: Require address, allow price range
- **SOS Assistants**: Require phone number in description
- **FAQ**: Question (name) and answer (description) are required
- **Address**: Required for location-based categories
- **Date Range**: End date must be after or equal to start date
- **Time Range**: End time must be after start time on the same date

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