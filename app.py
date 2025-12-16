"""
Single-File Django + TypeScript Application
Complete Teable Attachment Viewer with PDF.js
"""

from django.http import HttpResponse, StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
TEABLE_API_URL = os.getenv('TEABLE_API_URL', 'https://teable.namuve.com/api')
TABLE_ID = os.getenv('TABLE_ID', '')
TEABLE_TOKEN = os.getenv('TEABLE_TOKEN', '')


@csrf_exempt
def index(request):
    """Main view that serves the complete HTML with inline TypeScript and CSS"""
    html = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=3.0">
    <title>Teable Attachment Viewer</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    </script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
            color: #1e293b;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        .container { max-width: 100%; margin: 0; padding: 0; }
        .card { background: white; border-radius: 0; box-shadow: none; padding: 0; margin: 0; }
        .table-container { overflow-x: auto; margin: 0; padding: 0; }
        
        table { width: 100%; border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; }
        th { padding: 12px; background: #1e293b; color: white; text-align: left; font-weight: 600; }
        td { padding: 5px; border-bottom: 1px solid #e2e8f0; color: #475569; vertical-align: middle; }
        
        .attachments-wrapper {
            display: flex;
            flex-direction: column;
            gap: 0;
            align-items: center;
            margin: 0 auto;
            padding: 0;
            width: 100%;
        }
        
        .media-container {
            width: 100%;
            max-width: 500px;
            height: auto;
            background: transparent;
            border: none;
            display: block;
            cursor: pointer;
            margin: 0 auto;
            padding: 0;
        }
        
        .attachment-img {
            width: 100%;
            height: auto;
            display: block;
            margin: 0;
            padding: 0;
        }
        
        .pdf-canvas-wrapper {
            width: 100%;
            max-width: 900px;
            background: none;
            border: none;
            padding: 0;
            margin: 0 auto;
        }
        
        .attachment-pdf-canvas {
            width: 100%;
            height: auto;
            display: block;
            margin: 0;
            padding: 0;
            image-rendering: auto;
            image-rendering: high-quality;
            -ms-interpolation-mode: bicubic;
            backface-visibility: hidden;
            -webkit-font-smoothing: antialiased;
        }
        
        .pdf-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 30px;
            color: #64748b;
            font-size: 14px;
        }
        
        .spinner {
            width: 20px;
            height: 20px;
            border: 3px solid #e2e8f0;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Attachment</th>
                        </tr>
                    </thead>
                    <tbody id="recordsTableBody">
                        <tr>
                            <td style="text-align:center; color: #888;">Loading...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // Component-Based Architecture (Plain JavaScript)
        
        // PDF Render Queue
        window.pdfRenderTasks = [];

        // AttachmentRenderer Component
        class AttachmentRenderer {
            static filterAllowedTypes(file) {
                const mimetype = file.mimetype || '';
                const isJpg = mimetype === 'image/jpeg' || mimetype === 'image/jpg';
                const isPdf = mimetype === 'application/pdf';
                
                if (!isJpg && !isPdf) {
                    console.log(`[FILTER] Skipping: ${file.name} (${mimetype})`);
                    return false;
                }
                return true;
            }

            static normalizeUrl(url) {
                if (url && url.startsWith('/')) {
                    return 'https://teable.namuve.com' + url;
                }
                return url;
            }

            static createImageElement(url, fileName) {
                const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
                return `
                    <div class="media-container">
                        <img src="${proxyUrl}" 
                             alt="${fileName}" 
                             class="attachment-img"
                             loading="lazy">
                    </div>
                `;
            }

            static createPDFElement(url) {
                const uniqueId = `pdf-${Math.random().toString(36).substr(2, 9)}`;
                const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
                
                window.pdfRenderTasks.push({ url: proxyUrl, containerId: uniqueId });
                
                return `
                    <div id="${uniqueId}" class="pdf-canvas-wrapper">
                        <div class="pdf-loading">
                            <div class="spinner"></div>
                            <span>Loading PDF...</span>
                        </div>
                    </div>
                `;
            }

            static render(files) {
                if (!files || files.length === 0) return 'No attachments';
                
                const html = ['<div class="attachments-wrapper">'];
                
                files.forEach(file => {
                    if (!this.filterAllowedTypes(file)) return;
                    
                    let url = file.url || file.presignedUrl;
                    if (!url) return;
                    
                    url = this.normalizeUrl(url);
                    const mimetype = file.mimetype || '';
                    
                    if (mimetype.startsWith('image/')) {
                        html.push(this.createImageElement(url, file.name));
                    } else if (mimetype === 'application/pdf') {
                        html.push(this.createPDFElement(url));
                    }
                });
                
                html.push('</div>');
                return html.join('');
            }
        }

        // PDFRenderer Component
        class PDFRenderer {
            static async renderToCanvas(url, containerId) {
                try {
                    console.log(`[PDF] Starting: ${containerId}`);
                    const loadingTask = pdfjsLib.getDocument(url);
                    const pdf = await loadingTask.promise;
                    console.log(`[PDF] Loaded. Pages: ${pdf.numPages}`);
                    
                    const container = document.getElementById(containerId);
                    if (!container) return;
                    
                    container.innerHTML = '';

                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        console.log(`[PDF] Rendering ${pageNum}/${pdf.numPages}`);
                        const page = await pdf.getPage(pageNum);
                        
                        const canvas = document.createElement('canvas');
                        canvas.className = 'attachment-pdf-canvas';
                        container.appendChild(canvas);

                        // Render at FIXED large size with high quality
                        const fixedDisplayWidth = 900;  // Fixed large width for visibility
                        const renderScale = 4.0;  // 4x quality for sharpness
                        
                        const nativeViewport = page.getViewport({ scale: 1.0 });
                        
                        // Calculate scale to achieve fixed display width
                        const scaleToFit = fixedDisplayWidth / nativeViewport.width;
                        const finalRenderViewport = page.getViewport({ scale: scaleToFit * renderScale });
                        
                        // Set canvas to high resolution
                        canvas.width = finalRenderViewport.width;
                        canvas.height = finalRenderViewport.height;
                        
                        // Display at fixed 900px
                        canvas.style.width = `${fixedDisplayWidth}px`;
                        canvas.style.height = `${Math.floor(fixedDisplayWidth * (nativeViewport.height / nativeViewport.width))}px`;
                        
                        console.log(`[PDF] Rendering at ${fixedDisplayWidth}px display, ${canvas.width}px canvas (${renderScale}x quality)`);
                        
                        const context = canvas.getContext('2d');
                        await page.render({
                            canvasContext: context,
                            viewport: finalRenderViewport
                        }).promise;
                    }
                    console.log(`[PDF] Complete: ${containerId}`);
                } catch (error) {
                    console.error('[PDF] Error:', error);
                    const container = document.getElementById(containerId);
                    if (container) {
                        container.innerHTML = '<div style="color:red;padding:10px;">Failed to render PDF</div>';
                    }
                }
            }

            static processQueue() {
                console.log(`[MAIN] Processing ${window.pdfRenderTasks.length} PDFs`);
                window.pdfRenderTasks.forEach((task, index) => {
                    setTimeout(() => {
                        console.log(`[MAIN] Starting PDF ${index + 1}/${window.pdfRenderTasks.length}`);
                        this.renderToCanvas(task.url, task.containerId).catch(err => {
                            console.error(`[MAIN] Failed PDF ${index + 1}:`, err);
                        });
                    }, index * 100);
                });
                window.pdfRenderTasks = [];
            }
        }

        // RecordManager Component
        class RecordManager {
            static async fetchRecords() {
                const tbody = document.getElementById('recordsTableBody');
                if (!tbody) return;

                try {
                    const response = await fetch('/api/records');
                    const data = await response.json();
                    
                    if (!data.records || data.records.length === 0) {
                        tbody.innerHTML = '<tr><td style="text-align:center;padding:20px;">No records found</td></tr>';
                        return;
                    }

                    tbody.innerHTML = '';
                    
                    data.records.forEach(record => {
                        const attachments = Object.values(record.fields).find(
                            val => Array.isArray(val) && val.length > 0 && val[0].mimetype
                        );
                        
                        // Skip records with no attachments
                        if (!attachments || attachments.length === 0) {
                            return;
                        }
                        
                        const attachmentContent = AttachmentRenderer.render(attachments || []);
                        
                        // Skip if no valid JPG/PDF attachments after filtering
                        if (attachmentContent === 'No attachments') {
                            return;
                        }
                        
                        const tr = document.createElement('tr');
                        tr.innerHTML = `<td>${attachmentContent}</td>`;
                        tbody.appendChild(tr);
                    });

                    PDFRenderer.processQueue();

                } catch (error) {
                    console.error('Fetch error:', error);
                    tbody.innerHTML = '<tr><td style="text-align:center;color:#ef4444;padding:20px;">Failed to load records</td></tr>';
                }
            }
        }

        // Initialize on load
        RecordManager.fetchRecords();
    </script>
</body>
</html>
'''
    return HttpResponse(html)


@csrf_exempt
def get_records(request):
    """API endpoint to fetch Teable records"""
    try:
        headers = {'Authorization': f'Bearer {TEABLE_TOKEN}'}
        response = requests.get(
            f'{TEABLE_API_URL}/table/{TABLE_ID}/record',
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        return JsonResponse(response.json())
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt  
def proxy_file(request):
    """Proxy endpoint to serve files with inline disposition"""
    url = request.GET.get('url')
    if not url:
        return HttpResponse('Missing url', status=400)
    
    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        streaming_response = StreamingHttpResponse(
            response.iter_content(chunk_size=8192),
            content_type=response.headers.get('content-type', 'application/octet-stream')
        )
        
        streaming_response['Content-Disposition'] = 'inline'
        streaming_response['Cache-Control'] = 'public, max-age=31536000'
        
        return streaming_response
    except Exception as e:
        return HttpResponse(f'Proxy error: {str(e)}', status=500)


# Django URL Configuration
from django.urls import path

urlpatterns = [
    path('', index, name='index'),
    path('api/records', get_records, name='records'),
    path('api/proxy', proxy_file, name='proxy'),
]


# Django Settings (minimal)
SECRET_KEY = 'django-insecure-single-file-app-key'
DEBUG = True
ALLOWED_HOSTS = ['*']
ROOT_URLCONF = __name__
WSGI_APPLICATION = None

# Run with: python app.py
if __name__ == '__main__':
    import sys
    from django.core.management import execute_from_command_line
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', __name__)
    execute_from_command_line(sys.argv)
