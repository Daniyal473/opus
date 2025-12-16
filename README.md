# Teable Attachment Viewer

Single-file Django application for displaying JPG images and PDF documents from Teable API.

## Features

- ✅ **Single File Architecture**: Complete app in `app.py`
- ✅ **Component-Based Frontend**: JavaScript classes for clean code organization
- ✅ **PDF.js Integration**: High-quality PDF rendering (4x quality, 900px width)
- ✅ **Image Display**: Full-resolution JPG/JPEG images (500px width)
- ✅ **Smart Filtering**: Only shows JPG and PDF attachments
- ✅ **Responsive**: Works at all browser zoom levels
- ✅ **Progressive Loading**: Non-blocking PDF rendering
- ✅ **File Proxy**: Serves external files with proper headers

## Requirements

```bash
pip install django python-dotenv requests
```

## Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd <repo-folder>
```

2. **Create `.env` file**
```env
TEABLE_API_URL=https://teable.namuve.com/api
TABLE_ID=your_table_id_here
TEABLE_TOKEN=your_api_token_here
```

3. **Run the application**
```bash
python app.py runserver
```

4. **Open browser**
```
http://localhost:8000
```

## File Structure

```
.
├── app.py              # Complete Django application (backend + frontend)
├── .env                # Environment variables (not in git)
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## API Endpoints

- `GET /` - Main page with embedded frontend
- `GET /api/records` - Fetch Teable records
- `GET /api/proxy?url=<url>` - Proxy external files

## Configuration

All configuration is in `.env`:
- `TEABLE_API_URL`: Base URL for Teable API
- `TABLE_ID`: Your Teable table ID
- `TEABLE_TOKEN`: Your Teable API authentication token

## Deployment

### Local Development
```bash
python app.py runserver
```

### Production (Gunicorn)
```bash
pip install gunicorn
gunicorn app:application
```

### Environment Variables
Make sure to set all required environment variables on your hosting platform.

## Technologies

- **Backend**: Django (Python)
- **Frontend**: Vanilla JavaScript (ES6+ classes)
- **PDF Rendering**: PDF.js
- **Styling**: Embedded CSS
- **HTTP Client**: Requests

## License

MIT
