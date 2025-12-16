document.addEventListener('DOMContentLoaded', () => {
    fetchRecords();
    setupModal();
});

function setupModal() {
    const modal = document.getElementById('previewModal');
    const closeBtn = document.querySelector('.close-modal');

    closeBtn.onclick = function () {
        modal.style.display = 'none';
        document.getElementById('modalBody').innerHTML = ''; // Clear content
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = 'none';
            document.getElementById('modalBody').innerHTML = '';
        }
    }
}

function openModal(type, url, name) {
    const modal = document.getElementById('previewModal');
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = '<div style="color:#666;">Loading...</div>';
    modal.style.display = 'block';

    if (type === 'image') {
        const img = document.createElement('img');
        img.src = url;
        img.alt = name;
        img.onload = () => {
            if (modalBody.contains(img)) return;
        };
        modalBody.innerHTML = '';
        modalBody.appendChild(img);
    } else if (type === 'pdf') {
        const pdfUrl = `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
        modalBody.innerHTML = `<iframe src="${pdfUrl}" title="${name}" frameborder="0" allowfullscreen></iframe>`;
    }
}

async function fetchRecords() {
    const tbody = document.getElementById('recordsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Loading records...</td></tr>';

    try {
        const response = await fetch('/api/records');
        const data = await response.json();

        tbody.innerHTML = '';

        if (!data.records || data.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No records found.</td></tr>';
            return;
        }

        data.records.forEach(record => {
            const tr = document.createElement('tr');

            const getVal = (key) => {
                let val = record.fields[key] || record.fields[key + ' '] || record.fields[key.trim()] || '-';
                return val;
            };

            const name = getVal('Name');
            const cnic = getVal('CNIC / Passport');

            // Dates
            const checkIn = getVal('Check in Date');
            const checkOut = getVal('Check out Date');
            const dateStr = `${checkIn} <br><span style="color:#94a3b8; font-size:0.8em">to</span><br> ${checkOut}`;

            const ticketId = getVal('Ticket ID');

            // Attachment logic updated to support multiple files
            let attachmentContent = '<span style="color:#cbd5e1;">-</span>';
            const attData = record.fields['Attachments'] || record.fields['Attachments '] || record.fields['Attachment'];

            if (attData && Array.isArray(attData) && attData.length > 0) {
                attachmentContent = '<div class="attachments-wrapper">';

                attData.forEach(file => {
                    const mimetype = file.mimetype || '';

                    // ONLY show JPG/JPEG and PDF - skip everything else
                    const isJpg = mimetype === 'image/jpeg' || mimetype === 'image/jpg';
                    const isPdf = mimetype === 'application/pdf';

                    if (!isJpg && !isPdf) {
                        console.log(`[FILTER] Skipping file: ${file.name} (type: ${mimetype})`);
                        return; // Skip this file
                    }

                    let url = file.url || file.presignedUrl;

                    // Fix relative URLs
                    if (url && url.startsWith('/')) {
                        url = 'https://teable.namuve.com' + url;
                    }

                    if (url) {
                        const fileName = file.name || 'File';

                        // Use FULL RESOLUTION for high quality
                        let displayUrlRaw = url;
                        // Use original URL for the full view (modal/new tab)
                        let fullUrlRaw = url;

                        // Fix relative URLs for thumbnails
                        if (displayUrlRaw && displayUrlRaw.startsWith('/')) displayUrlRaw = 'https://teable.namuve.com' + displayUrlRaw;
                        if (fullUrlRaw && fullUrlRaw.startsWith('/')) fullUrlRaw = 'https://teable.namuve.com' + fullUrlRaw;

                        // Create proxy URLs
                        const proxyDisplayUrl = `/api/proxy?url=${encodeURIComponent(displayUrlRaw)}`;
                        const proxyFullUrl = `/api/proxy?url=${encodeURIComponent(fullUrlRaw)}`;

                        if (mimetype.startsWith('image/')) {
                            // Show thumbnail in table (fast load), click to open full image
                            attachmentContent += `
                                <div class="media-container" onclick="openModal('image', '${proxyFullUrl}', '${fileName}')" title="View Image">
                                    <img src="${proxyDisplayUrl}" alt="${fileName}" class="attachment-img" loading="lazy">
                                </div>
                            `;
                        } else if (mimetype === 'application/pdf') {
                            // PDF.js canvas approach - NO black background, ultra HD quality
                            const uniqueId = `pdf-${Math.random().toString(36).substr(2, 9)}`;

                            attachmentContent += `
                                <div id="${uniqueId}" class="pdf-canvas-wrapper">
                                    <div class="pdf-loading">
                                        <div class="spinner"></div>
                                        <span>Loading PDF...</span>
                                    </div>
                                </div>
                            `;

                            // Queue render task - will execute after DOM is ready
                            if (!window.pdfRenderTasks) window.pdfRenderTasks = [];
                            window.pdfRenderTasks.push({ url: proxyFullUrl, containerId: uniqueId });

                        } else {
                            attachmentContent += `<a href="${url}" target="_blank" class="attachment-link">Download</a>`;
                        }
                    }
                });

                attachmentContent += '</div>';
            }

            tr.innerHTML = `
                <td>${attachmentContent}</td>
            `;
            tbody.appendChild(tr);
        });

        // Execute queued PDF render tasks PROGRESSIVELY (non-blocking)
        console.log('[MAIN] Checking PDF render tasks...', window.pdfRenderTasks);
        if (window.pdfRenderTasks && window.pdfRenderTasks.length > 0) {
            console.log(`[MAIN] Rendering ${window.pdfRenderTasks.length} PDFs progressively`);

            // Render PDFs one at a time with small delays to keep page responsive
            window.pdfRenderTasks.forEach((task, index) => {
                // Delay each PDF by 100ms to prevent blocking
                setTimeout(() => {
                    console.log(`[MAIN] Starting PDF ${index + 1}/${window.pdfRenderTasks.length}`);
                    renderPdfToCanvas(task.url, task.containerId).catch(err => {
                        console.error(`[MAIN] Failed to render PDF ${index + 1}:`, err);
                    });
                }, index * 100);
            });
            window.pdfRenderTasks = [];
        } else {
            console.log('[MAIN] No PDF render tasks found');
        }

    } catch (error) {
        console.error('Fetch error:', error);
        tbody.innerHTML = '<tr><td style="text-align:center; color: #ef4444; padding: 20px;">Failed to load records.</td></tr>';
    }
}

async function renderPdfToCanvas(url, containerId) {
    try {
        console.log(`[PDF] Starting render for container: ${containerId}`);
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        console.log(`[PDF] Loaded successfully. Pages: ${pdf.numPages}`);

        const container = document.getElementById(containerId);
        if (!container) return;

        // Clear "Loading..." text or previous content
        container.innerHTML = '';

        // Render ALL pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            console.log(`[PDF] Rendering page ${pageNum}/${pdf.numPages}`);
            const page = await pdf.getPage(pageNum);

            const canvas = document.createElement('canvas');
            canvas.className = 'attachment-pdf-canvas';
            canvas.style.marginBottom = '10px'; // Add space between pages
            container.appendChild(canvas);

            // RENDER AT 1.5X NATIVE PDF RESOLUTION - Balance quality and speed
            // Get the PDF's native size at scale 1.0
            const nativeViewport = page.getViewport({ scale: 1.0 });

            // Render at 1.5x for good quality with faster loading
            const renderScale = 1.5;
            const renderViewport = page.getViewport({ scale: renderScale });

            // Set canvas to render at 1.5x native resolution
            canvas.width = renderViewport.width;
            canvas.height = renderViewport.height;

            // Calculate display width (fit to 1000px max, but maintain aspect ratio)
            const maxDisplayWidth = 500;
            const displayScale = Math.min(maxDisplayWidth / nativeViewport.width, 1.0);
            const displayWidth = nativeViewport.width * displayScale;
            const displayHeight = nativeViewport.height * displayScale;

            // Set CSS size for display (scaled down from render size)
            canvas.style.width = `${Math.floor(displayWidth)}px`;
            canvas.style.height = `${Math.floor(displayHeight)}px`;

            console.log(`[PDF] Native: ${nativeViewport.width}x${nativeViewport.height}, Render: ${canvas.width}x${canvas.height}, Display: ${displayWidth}x${displayHeight}`);

            const context = canvas.getContext('2d');
            const renderContext = {
                canvasContext: context,
                viewport: renderViewport
            };
            await page.render(renderContext).promise;
        }
    } catch (error) {
        console.error("Error rendering PDF:", error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<div style="color:red; font-size:12px; padding:10px;">Failed to render PDF</div>';
        }
    }
}
