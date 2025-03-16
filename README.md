# TeleBot Admin Dashboard

A knowledge management system with a FastAPI backend and React frontend.

## Deployment to Hugging Face Spaces

This application is designed to be deployed as a Docker-based Hugging Face Space.

### Backend Deployment

1. Create a new Hugging Face Space
   - Go to [Hugging Face](https://huggingface.co/)
   - Click on "New Space"
   - Choose "Docker" as the Space SDK
   - Name your space (e.g., "teleadmindb")

2. Configure Environment Variables in Hugging Face Space
   - Go to your Space's settings
   - Under "Repository secrets", add the following variables:
     - `AIVEN_DB_URL`: Your Aiven PostgreSQL connection string

3. Upload Backend Files
   - Upload the following files to your Space:
     - `app/app.py`
     - `app/Dockerfile`
     - `app/requirements.txt`

### Frontend Configuration

1. Update API URL in frontend
   - The frontend is configured to connect to your Hugging Face Space API
   - The API URL is set to `https://[your-username]-teleadmindb.hf.space/api`
   - This can be modified in `src/lib/db.ts` if needed

## Local Development

### Backend

1. Set up environment variables:
   ```
   DB_CONNECTION_MODE=local  # Or "aiven" to use PostgreSQL
   AIVEN_DB_URL=your_aiven_postgresql_url  # Only needed if DB_CONNECTION_MODE=aiven
   ```

2. Install dependencies:
   ```
   pip install -r app/requirements.txt
   ```

3. Run the backend:
   ```
   cd app
   uvicorn app:app --host 0.0.0.0 --port 3001
   ```

### Frontend

1. Install dependencies:
   ```
   npm install
   ```

2. Run the frontend:
   ```
   npm run dev
   ```

## Testing

Use the included test script to verify the API is working correctly:
```
cd app
python test_api.py
```

## Login Credentials

Use the following credentials to login to the admin dashboard:
- Username: admin
- Password: password 