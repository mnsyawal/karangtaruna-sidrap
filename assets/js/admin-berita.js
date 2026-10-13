
let beritaData = [];
let quill;
let isEditMode = false;
let userRole = 'USER';

let quillImageResizer = null;
let cropperInstance = null;
let croppedFotoUtamaBase64 = '';
let originalFotoUtamaSrc = '';
let currentRatioLabel = '16:9 (Rekomendasi Berita)';
let cropModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    
    document.getElementById('btnToggleSidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('show');
        document.getElementById('sidebarOverlay').classList.add('show');
    });
    document.getElementById('sidebarOverlay').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('show');
        document.getElementById('sidebarOverlay').classList.remove('show');
    });

    const userStr = localStorage.getItem('KT_USER');
    if (userStr) {
        const userObj = JSON.parse(userStr);
        userRole = userObj.role;
    }

    quill = new Quill('#editor', {
        theme: 'snow',
        modules: {
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['blockquote', 'code-block'],
                    ['link', 'image'],  
                    [{ 'align': [] }],
                    ['clean']
                ],
                handlers: {
                    image: imageHandler  
                }
            }
        }
    });

    quillImageResizer = initQuillImageResizer(quill);

    initCropperFotoUtama();

    loadTableBerita();

    document.getElementById('formBerita').addEventListener('submit', handleSaveBerita);
});

async function loadTableBerita() {
    const tbody = document.getElementById('tableBeritaBody');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat data...</td></tr>`;

    const res = await fetchAPI('getBerita', { limit: 100 }, false);
    
    if (res && res.success) {
        beritaData = res.data;
        renderTable(beritaData);
    } else {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Gagal memuat data berita.</td></tr>`;
    }
}

function renderTable(data) {
    const tbody = document.getElementById('tableBeritaBody');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada berita.</td></tr>`;
        return;
    }

    data.forEach(item => {
        const statusBadge = item.status === 'published' 
            ? `<span class="badge bg-success">Published</span>` 
            : `<span class="badge bg-secondary">Draft</span>`;
        
        let actionButtons = `<button class="btn btn-sm btn-primary me-1" onclick="editBerita('${item.id}')" title="Edit"><i class="fa-solid fa-edit"></i></button>`;
        
        if (userRole === 'ADMIN') {
            actionButtons += `<button class="btn btn-sm btn-danger" onclick="deleteBerita('${item.id}')" title="Hapus"><i class="fa-solid fa-trash"></i></button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${escapeHtml(item.judul)}</td>
            <td><span class="badge bg-light text-dark border">${escapeHtml(item.kategori)}</span></td>
            <td>${item.tanggal}</td>
            <td>${statusBadge}</td>
            <td class="text-end">${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

function showForm() {
    isEditMode = false;
    document.getElementById('formBerita').reset();
    document.getElementById('beritaId').value = '';
    document.getElementById('gambarLama').value = '';
    
    croppedFotoUtamaBase64 = '';
    originalFotoUtamaSrc = '';
    document.getElementById('fotoUtamaPreviewContainer').classList.add('d-none');
    document.getElementById('gambarInput').value = '';

    if (quillImageResizer) quillImageResizer.hide();
    quill.root.innerHTML = '';
    document.getElementById('kode_embed').value = '';
    document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
    
    document.getElementById('formTitle').innerText = 'Tulis Berita Baru';
    document.getElementById('viewList').classList.add('d-none');
    document.getElementById('viewForm').classList.remove('d-none');
}

function hideForm() {
    if (quillImageResizer) quillImageResizer.hide();
    document.getElementById('viewForm').classList.add('d-none');
    document.getElementById('viewList').classList.remove('d-none');
}

function editBerita(id) {
    const item = beritaData.find(b => b.id === id);
    if (!item) return;

    isEditMode = true;
    document.getElementById('beritaId').value = item.id;
    document.getElementById('judul').value = item.judul;
    document.getElementById('kategori').value = item.kategori;
    document.getElementById('tanggal').value = item.tanggal;
    document.getElementById('status').value = item.status;
    document.getElementById('gambarLama').value = item.gambar || '';
    
    croppedFotoUtamaBase64 = '';
    if (item.gambar) {
        document.getElementById('fotoUtamaPreviewImg').src = getImageUrl(item.gambar);
        document.getElementById('badgeRatioUtama').innerText = 'Foto Berita Saat Ini';
        document.getElementById('fotoUtamaPreviewContainer').classList.remove('d-none');
        originalFotoUtamaSrc = getImageUrl(item.gambar);
    } else {
        document.getElementById('fotoUtamaPreviewContainer').classList.add('d-none');
        originalFotoUtamaSrc = '';
    }

    if (quillImageResizer) quillImageResizer.hide();

    let rawIsi = item.isi || '';
    let embedCode = '';
    const embedMarker = '<div class="embed-container mt-4">';
    if (rawIsi.includes(embedMarker)) {
        const parts = rawIsi.split(embedMarker);
        quill.root.innerHTML = parts[0];
        embedCode = parts[1].replace('</div>', '').trim();
        document.getElementById('kode_embed').value = embedCode;
    } else {
        quill.root.innerHTML = rawIsi;
        document.getElementById('kode_embed').value = '';
    }

    document.getElementById('formTitle').innerText = 'Edit Berita';
    document.getElementById('viewList').classList.add('d-none');
    document.getElementById('viewForm').classList.remove('d-none');
}

function initCropperFotoUtama() {
    const fileInput = document.getElementById('gambarInput');
    const modalEl = document.getElementById('modalCropFoto');
    const btnApply = document.getElementById('btnApplyCrop');
    const btnRecrop = document.getElementById('btnRecrop');
    const btnHapus = document.getElementById('btnHapusFoto');
    const ratioBtns = document.querySelectorAll('#ratioButtonGroup button');

    if (modalEl && typeof bootstrap !== 'undefined') {
        cropModalInstance = new bootstrap.Modal(modalEl);
    }

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            Swal.fire('Peringatan', 'Ukuran foto maksimal 2MB', 'warning');
            fileInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
            originalFotoUtamaSrc = evt.target.result;
            openCropModal(originalFotoUtamaSrc, 16 / 9, '16:9 (Rekomendasi Berita)');
        };
        reader.readAsDataURL(file);
    });

    if (btnRecrop) {
        btnRecrop.addEventListener('click', () => {
            const targetSrc = croppedFotoUtamaBase64 || originalFotoUtamaSrc || document.getElementById('gambarLama').value;
            if (targetSrc) {
                openCropModal(getImageUrl(targetSrc), 16 / 9, currentRatioLabel);
            }
        });
    }

    if (btnHapus) {
        btnHapus.addEventListener('click', () => {
            croppedFotoUtamaBase64 = '';
            originalFotoUtamaSrc = '';
            fileInput.value = '';
            document.getElementById('gambarLama').value = '';
            document.getElementById('fotoUtamaPreviewContainer').classList.add('d-none');
        });
    }

    ratioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ratioBtns.forEach(b => {
                b.classList.remove('btn-success', 'active');
                b.classList.add('btn-outline-secondary');
            });
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-success', 'active');

            const ratioVal = parseFloat(btn.getAttribute('data-ratio'));
            currentRatioLabel = btn.innerText.trim();

            if (cropperInstance) {
                cropperInstance.setAspectRatio(isNaN(ratioVal) ? NaN : ratioVal);
            }
        });
    });

    document.getElementById('btnCropRotateLeft')?.addEventListener('click', () => cropperInstance && cropperInstance.rotate(-90));
    document.getElementById('btnCropRotateRight')?.addEventListener('click', () => cropperInstance && cropperInstance.rotate(90));
    document.getElementById('btnCropZoomIn')?.addEventListener('click', () => cropperInstance && cropperInstance.zoom(0.1));
    document.getElementById('btnCropZoomOut')?.addEventListener('click', () => cropperInstance && cropperInstance.zoom(-0.1));
    document.getElementById('btnCropReset')?.addEventListener('click', () => cropperInstance && cropperInstance.reset());

    btnApply.addEventListener('click', () => {
        if (!cropperInstance) return;

        const canvas = cropperInstance.getCroppedCanvas({
            maxWidth: 1600,
            maxHeight: 900,
            fillColor: '#ffffff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        });

        if (!canvas) {
            Swal.fire('Error', 'Gagal memproses gambar.', 'error');
            return;
        }

        croppedFotoUtamaBase64 = canvas.toDataURL('image/jpeg', 0.88);

        document.getElementById('fotoUtamaPreviewImg').src = croppedFotoUtamaBase64;
        document.getElementById('badgeRatioUtama').innerText = currentRatioLabel;
        document.getElementById('fotoUtamaPreviewContainer').classList.remove('d-none');

        if (cropModalInstance) {
            cropModalInstance.hide();
        }
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }
    });
}

function openCropModal(imageSrc, ratio = 16 / 9, ratioLabel = '16:9 (Rekomendasi Berita)') {
    const imageTarget = document.getElementById('cropperImageTarget');
    imageTarget.src = imageSrc;
    currentRatioLabel = ratioLabel;

    const ratioBtns = document.querySelectorAll('#ratioButtonGroup button');
    ratioBtns.forEach(b => {
        b.classList.remove('btn-success', 'active');
        b.classList.add('btn-outline-secondary');
    });
    const defaultBtn = document.getElementById('btnRatio169');
    if (defaultBtn) {
        defaultBtn.classList.remove('btn-outline-secondary');
        defaultBtn.classList.add('btn-success', 'active');
    }

    if (!cropModalInstance) {
        cropModalInstance = new bootstrap.Modal(document.getElementById('modalCropFoto'));
    }
    cropModalInstance.show();

    const modalEl = document.getElementById('modalCropFoto');
    const onModalShown = () => {
        modalEl.removeEventListener('shown.bs.modal', onModalShown);
        if (cropperInstance) {
            cropperInstance.destroy();
        }
        if (typeof Cropper !== 'undefined') {
            cropperInstance = new Cropper(imageTarget, {
                aspectRatio: ratio,
                viewMode: 1,
                autoCropArea: 0.95,
                responsive: true,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true, 
                toggleDragModeOnDblclick: false,
            });
        }
    };
    modalEl.addEventListener('shown.bs.modal', onModalShown);
}

function initQuillImageResizer(quillInstance) {
    const editorContainer = document.getElementById('editor');
    const qlEditor = editorContainer.querySelector('.ql-editor');
    
    let activeImg = null;
    let overlay = null;
    let isDragging = false;
    let startX = 0;
    let initialWidth = 0;
    let currentAspectRatio = 1;
    let activeHandle = null;

    function createOverlay() {
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.className = 'quill-resizer-overlay d-none';
        overlay.innerHTML = `
            <div class="quill-resizer-handle nw" data-handle="nw" title="Tarik sudut untuk ubah ukuran (Rasio Aman)"></div>
            <div class="quill-resizer-handle ne" data-handle="ne" title="Tarik sudut untuk ubah ukuran (Rasio Aman)"></div>
            <div class="quill-resizer-handle sw" data-handle="sw" title="Tarik sudut untuk ubah ukuran (Rasio Aman)"></div>
            <div class="quill-resizer-handle se" data-handle="se" title="Tarik sudut untuk ubah ukuran (Rasio Aman)"></div>
            <div class="quill-resizer-toolbar">
                <button type="button" data-action="align-left" title="Rata Kiri"><i class="fa-solid fa-align-left"></i> Kiri</button>
                <button type="button" data-action="align-center" title="Rata Tengah"><i class="fa-solid fa-align-center"></i> Tengah</button>
                <button type="button" data-action="align-right" title="Rata Kanan"><i class="fa-solid fa-align-right"></i> Kanan</button>
                <span class="badge-dim" id="quillResizerDim">0 × 0 px</span>
                <button type="button" data-action="reset-size" title="Kembalikan Penuh (100%)"><i class="fa-solid fa-rotate-left"></i> 100%</button>
                <button type="button" data-action="delete-img" class="text-danger" title="Hapus Foto"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        editorContainer.appendChild(overlay);

        overlay.querySelector('.quill-resizer-toolbar').addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn || !activeImg) return;
            const action = btn.getAttribute('data-action');
            if (action === 'align-left') {
                activeImg.style.display = 'block';
                activeImg.style.marginLeft = '0';
                activeImg.style.marginRight = 'auto';
                updateOverlayPos();
            } else if (action === 'align-center') {
                activeImg.style.display = 'block';
                activeImg.style.marginLeft = 'auto';
                activeImg.style.marginRight = 'auto';
                updateOverlayPos();
            } else if (action === 'align-right') {
                activeImg.style.display = 'block';
                activeImg.style.marginLeft = 'auto';
                activeImg.style.marginRight = '0';
                updateOverlayPos();
            } else if (action === 'reset-size') {
                activeImg.style.width = '100%';
                activeImg.style.height = 'auto';
                activeImg.removeAttribute('width');
                updateOverlayPos();
            } else if (action === 'delete-img') {
                activeImg.remove();
                hideOverlay();
            }
        });

        overlay.querySelectorAll('.quill-resizer-handle').forEach(handle => {
            handle.addEventListener('mousedown', startDrag);
            handle.addEventListener('touchstart', startDrag, { passive: false });
        });

        return overlay;
    }

    function updateOverlayPos() {
        if (!activeImg || !overlay) return;
        const editorRect = editorContainer.getBoundingClientRect();
        const imgRect = activeImg.getBoundingClientRect();

        if (imgRect.width === 0 && imgRect.height === 0) {
            hideOverlay();
            return;
        }

        const top = imgRect.top - editorRect.top;
        const left = imgRect.left - editorRect.left;

        overlay.style.top = top + 'px';
        overlay.style.left = left + 'px';
        overlay.style.width = imgRect.width + 'px';
        overlay.style.height = imgRect.height + 'px';
        overlay.classList.remove('d-none');

        const dimBadge = overlay.querySelector('#quillResizerDim');
        if (dimBadge) {
            dimBadge.innerText = Math.round(imgRect.width) + ' × ' + Math.round(imgRect.height) + ' px';
        }
    }

    function showOverlay(img) {
        activeImg = img;
        createOverlay();
        if (img.naturalWidth && img.naturalHeight) {
            currentAspectRatio = img.naturalWidth / img.naturalHeight;
        } else {
            currentAspectRatio = img.clientWidth / (img.clientHeight || 1);
        }
        updateOverlayPos();
    }

    function hideOverlay() {
        if (overlay) overlay.classList.add('d-none');
        activeImg = null;
    }

    function startDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        activeHandle = e.target.getAttribute('data-handle');
        
        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        startX = clientX;
        initialWidth = activeImg.clientWidth;

        if (activeImg.naturalWidth && activeImg.naturalHeight) {
            currentAspectRatio = activeImg.naturalWidth / activeImg.naturalHeight;
        } else {
            currentAspectRatio = initialWidth / (activeImg.clientHeight || 1);
        }

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', onDrag, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    function onDrag(e) {
        if (!isDragging || !activeImg) return;
        if (e.cancelable) e.preventDefault();

        const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        const deltaX = clientX - startX;

        let newWidth = initialWidth;
        if (activeHandle === 'se' || activeHandle === 'ne') {
            newWidth = initialWidth + deltaX;
        } else if (activeHandle === 'sw' || activeHandle === 'nw') {
            newWidth = initialWidth - deltaX;
        }

        const minW = 80;
        const maxW = editorContainer.clientWidth - 40;
        newWidth = Math.max(minW, Math.min(newWidth, maxW));

        const newHeight = Math.round(newWidth / currentAspectRatio);

        activeImg.style.width = newWidth + 'px';
        activeImg.style.height = 'auto'; 
        activeImg.setAttribute('width', newWidth);

        updateOverlayPos();
    }

    function endDrag() {
        isDragging = false;
        activeHandle = null;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', endDrag);
        updateOverlayPos();
    }

    qlEditor.addEventListener('click', (e) => {
        if (e.target && e.target.tagName === 'IMG') {
            showOverlay(e.target);
        } else {
            if (!e.target.closest('.quill-resizer-overlay')) {
                hideOverlay();
            }
        }
    });

    qlEditor.addEventListener('scroll', () => {
        if (activeImg && !isDragging) updateOverlayPos();
    });

    window.addEventListener('resize', () => {
        if (activeImg && !isDragging) updateOverlayPos();
    });

    quillInstance.on('text-change', () => {
        if (!isDragging) {
            if (activeImg && !document.contains(activeImg)) {
                hideOverlay();
            } else if (activeImg) {
                updateOverlayPos();
            }
        }
    });

    return {
        show: showOverlay,
        hide: hideOverlay
    };
}

const fileToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

function imageHandler() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            Swal.fire('Gagal', 'Ukuran gambar inline maksimal 2MB', 'error');
            return;
        }

        Swal.fire({
            title: 'Mengunggah foto...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        try {
            const base64 = await fileToBase64(file);
            const res = await postAPI('uploadInlineImage', { 
                imageBase64: base64,
                filename: 'INLINE_' + new Date().getTime()
            }, true);

            Swal.close();

            if (res && res.success && res.data && res.data.url) {
                const range = quill.getSelection(true);
                quill.insertEmbed(range.index, 'image', res.data.url);
                quill.setSelection(range.index + 1);

                setTimeout(() => {
                    const imgs = document.querySelectorAll('#editor .ql-editor img');
                    if (imgs.length > 0) {
                        const lastImg = imgs[imgs.length - 1];
                        if (lastImg && quillImageResizer) {
                            lastImg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            quillImageResizer.show(lastImg);
                        }
                    }
                }, 200);
            } else {
                Swal.fire('Gagal', res ? res.message : 'Gagal mengunggah foto', 'error');
            }
        } catch (err) {
            Swal.close();
            Swal.fire('Error', 'Gagal memproses foto.', 'error');
        }
    };
}

async function handleSaveBerita(e) {
    e.preventDefault();
    
    if (quillImageResizer) quillImageResizer.hide();

    const btnSave = document.getElementById('btnSaveBerita');
    const originalText = btnSave.innerHTML;
    
    let isiHTML = quill.root.innerHTML;
    if (isiHTML === '<p><br></p>' || !isiHTML.trim()) {
        Swal.fire('Peringatan', 'Isi berita tidak boleh kosong', 'warning');
        return;
    }

    const kodeEmbedVal = document.getElementById('kode_embed').value.trim();
    if (kodeEmbedVal !== '') {
        if (!isiHTML.includes('<div class="embed-container mt-4">')) {
            isiHTML += `\n<div class="embed-container mt-4">\n${kodeEmbedVal}\n</div>`;
        }
    }

    btnSave.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...';
    btnSave.disabled = true;

    try {
        const fileInput = document.getElementById('gambarInput');
        let imageBase64 = croppedFotoUtamaBase64;
        
        if (!imageBase64 && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire('Gagal', 'Ukuran foto maksimal 2MB', 'error');
                btnSave.innerHTML = originalText;
                btnSave.disabled = false;
                return;
            }
            imageBase64 = await fileToBase64(file);
        }

        const plainText = quill.getText().trim();
        const judul = document.getElementById('judul').value;
        const ringkasanText = cleanExcerpt(plainText, judul, 140);

        const payloadData = {
            id: document.getElementById('beritaId').value,
            judul: judul,
            kategori: document.getElementById('kategori').value,
            tanggal: document.getElementById('tanggal').value,
            status: document.getElementById('status').value,
            ringkasan: ringkasanText, 
            isi: isiHTML,
            gambar: document.getElementById('gambarLama').value,
            imageBase64: imageBase64
        };

        const action = isEditMode ? 'updateBerita' : 'createBerita';
        const res = await postAPI(action, payloadData, true);

        if (res && res.success) {
            Swal.fire('Berhasil', res.message, 'success').then(() => {
                hideForm();
                loadTableBerita();
                
                localStorage.removeItem('KT_CACHE_getBerita_{"limit":3}');
                localStorage.removeItem('KT_CACHE_getBerita_{"page":1,"limit":6,"search":"","kategori":""}');
            });
        } else {
            Swal.fire('Gagal', res ? res.message : 'Terjadi kesalahan sistem', 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Gagal memproses data.', 'error');
    } finally {
        btnSave.innerHTML = originalText;
        btnSave.disabled = false;
    }
}

function deleteBerita(id) {
    Swal.fire({
        title: 'Hapus Berita?',
        text: 'Data yang dihapus tidak dapat dikembalikan!',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.showLoading();
            const res = await postAPI('deleteBerita', { id: id }, true);
            
            if (res && res.success) {
                Swal.fire('Terhapus!', res.message, 'success');
                loadTableBerita();
            } else {
                Swal.fire('Gagal', res ? res.message : 'Gagal menghapus berita', 'error');
            }
        }
    });
}
