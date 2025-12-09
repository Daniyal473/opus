# TypeScript + Django Full Stack Project

A modern full-stack application with **TypeScript/React** frontend and **Django REST** backend.

## 🚀 Tech Stack

### Frontend
- **React 18** with **TypeScript**
- **Vite** for fast development
- **Axios** for API calls
- Modern CSS with gradients and animations

### Backend
- **Django 5.1.3**
- **Django REST Framework**
- **CORS Headers** for frontend communication
- **SQLite** database (easily changeable)

## 📁 Project Structure

```
new-project/
├── frontend/              # React + TypeScript application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API service layer
│   │   ├── types/         # TypeScript definitions
│   │   └── ...
│   └── package.json
│
└── backend/               # Django application
    ├── api/               # Django REST API app
    ├── core/              # Django project settings
    ├── manage.py
    └── requirements.txt
```

## 🛠️ Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run migrations (already done, but if needed):
   ```bash
   python manage.py migrate
   ```

4. Create a superuser (optional, for Django admin):
   ```bash
   python manage.py createsuperuser
   ```

5. Start the Django development server:
   ```bash
   python manage.py runserver
   ```

   The backend will run on **http://localhost:8000**

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies (already done, but if needed):
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on **http://localhost:5173**

## 🎯 API Endpoints

### Health Check
- **GET** `/api/health/` - Check if API is running

### Items CRUD
- **GET** `/api/items/` - List all items
- **POST** `/api/items/` - Create new item
- **GET** `/api/items/{id}/` - Get single item
- **PATCH** `/api/items/{id}/` - Update item
- **DELETE** `/api/items/{id}/` - Delete item

## 🧪 Testing the Integration

1. Make sure both servers are running:
   - Backend: `http://localhost:8000`
   - Frontend: `http://localhost:5173`

2. Open your browser to `http://localhost:5173`

3. You should see:
   - A green status indicator showing "API is running successfully!"
   - A form to create new items
   - A list of items (empty initially)

4. Try creating, viewing, and deleting items to test the full CRUD functionality

## 🔧 Development Features

- **Type Safety**: Full TypeScript support in frontend
- **Hot Reload**: Both frontend and backend support hot reloading
- **CORS Configured**: No cross-origin issues
- **Pretty UI**: Modern design with gradients and animations
- **Error Handling**: Comprehensive error handling in API calls

## 📝 Available Scripts

### Backend
```bash
python manage.py runserver    # Start dev server
python manage.py migrate       # Run migrations
python manage.py createsuperuser  # Create admin user
```

### Frontend
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🎨 Features Demo

The demo application includes:
- Real-time health check indicator
- Create items with title and description
- View all items in a responsive grid
- Delete items with one click
- Beautiful animations and hover effects
- Responsive design for mobile and desktop

## 🔐 Django Admin

Access the Django admin panel at `http://localhost:8000/admin/` after creating a superuser.

## 🚢 Production Deployment

For production deployment:
1. Set `DEBUG = False` in Django settings
2. Configure proper `ALLOWED_HOSTS`
3. Use a production database (PostgreSQL recommended)
4. Build frontend: `npm run build`
5. Serve frontend static files
6. Use a production WSGI server (gunicorn, uwsgi)

---

**Happy Coding! 🎉**
