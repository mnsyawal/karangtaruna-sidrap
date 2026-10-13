
document.addEventListener("DOMContentLoaded", () => {
    
    document.getElementById('btnToggleSidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('show');
        document.getElementById('sidebarOverlay').classList.add('show');
    });
    document.getElementById('sidebarOverlay').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('show');
        document.getElementById('sidebarOverlay').classList.remove('show');
    });

    const heroInput = document.getElementById('heroBgInput');
    if (heroInput) {
        heroInput.addEventListener('change', () => {
            const file = heroInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById('previewHero');
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    loadSettingsData();
    document.getElementById('formSettings').addEventListener('submit', handleSaveSettings);
});

async function loadSettingsData() {
    Swal.fire({ title: 'Memuat data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    const res = await fetchAPI('getSettings', {}, false);
    Swal.close();

    if (res && res.success && res.data) {
        const s = res.data;
        
        if (s.org_name) document.getElementById('org_name').value = s.org_name;
        if (s.org_shortname) document.getElementById('org_shortname').value = s.org_shortname;
        if (s.org_description) document.getElementById('org_description').value = s.org_description;
        if (s.org_address) document.getElementById('org_address').value = s.org_address;
        if (s.email) document.getElementById('email').value = s.email;
        if (s.phone) document.getElementById('phone').value = s.phone;
        if (s.facebook_url) document.getElementById('facebook_url').value = s.facebook_url;
        if (s.instagram_url) document.getElementById('instagram_url').value = s.instagram_url;
        if (s.footer_text) document.getElementById('footer_text').value = s.footer_text;
        
        if (s.logo_url) {
            document.getElementById('previewLogo').src = s.logo_url;
        }

        if (s.hero_bg_image) {
            const heroPreview = document.getElementById('previewHero');
            heroPreview.src = getImageUrl(s.hero_bg_image);
            heroPreview.style.display = 'block';
        }

        const themeKeys = ['theme_primary', 'theme_secondary', 'theme_dark', 'theme_bg'];
        const defaults = { theme_primary: '#203d92', theme_secondary: '#f06000', theme_dark: '#152556', theme_bg: '#F8FAFC' };
        
        themeKeys.forEach(key => {
            const val = s[key] || defaults[key];
            const colorInput = document.getElementById(key);
            const textInput = document.getElementById(key + '_text');
            if (colorInput) colorInput.value = val;
            if (textInput) textInput.value = val;
        });
        
        themeKeys.forEach(key => {
            const colorEl = document.getElementById(key);
            const textEl = document.getElementById(key + '_text');
            if (colorEl && textEl) {
                colorEl.addEventListener('input', () => { textEl.value = colorEl.value; });
                textEl.addEventListener('input', () => {
                    const v = textEl.value.trim();
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) colorEl.value = v;
                });
            }
        });
    }
}

const fileToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

async function handleSaveSettings(e) {
    e.preventDefault();
    const btnSave = document.getElementById('btnSaveSettings');
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...';
    btnSave.disabled = true;

    try {
        let logoBase64 = '';
        const fileInput = document.getElementById('logoInput');
        if (fileInput.files.length > 0) {
            if (fileInput.files[0].size > 1 * 1024 * 1024) { 
                Swal.fire('Gagal', 'Ukuran foto maksimal 1MB', 'error');
                btnSave.innerHTML = originalText; btnSave.disabled = false; return;
            }
            logoBase64 = await fileToBase64(fileInput.files[0]);
        }

        let heroBgBase64 = '';
        const heroInput = document.getElementById('heroBgInput');
        if (heroInput && heroInput.files.length > 0) {
            if (heroInput.files[0].size > 3 * 1024 * 1024) {
                Swal.fire('Gagal', 'Ukuran gambar hero maksimal 3MB', 'error');
                btnSave.innerHTML = originalText; btnSave.disabled = false; return;
            }
            heroBgBase64 = await fileToBase64(heroInput.files[0]);
        }

        const payloadData = {
            settings: {
                org_name: document.getElementById('org_name').value,
                org_shortname: document.getElementById('org_shortname').value,
                org_description: document.getElementById('org_description').value,
                org_address: document.getElementById('org_address').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                facebook_url: document.getElementById('facebook_url').value,
                instagram_url: document.getElementById('instagram_url').value,
                footer_text: document.getElementById('footer_text').value,
                
                theme_primary: document.getElementById('theme_primary_text').value,
                theme_secondary: document.getElementById('theme_secondary_text').value,
                theme_dark: document.getElementById('theme_dark_text').value,
                theme_bg: document.getElementById('theme_bg_text').value
            },
            logoBase64: logoBase64,
            heroBgBase64: heroBgBase64
        };

        const res = await postAPI('updateSettings', payloadData, true);

        if (res && res.success) {
            Swal.fire('Berhasil', res.message, 'success').then(() => {
                
                localStorage.removeItem('KT_CACHE_getSettings_{}');
                loadSettingsData(); 
            });
        } else {
            Swal.fire('Gagal', res ? res.message : 'Terjadi kesalahan sistem', 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'Gagal memproses data.', 'error');
    } finally {
        btnSave.innerHTML = originalText; btnSave.disabled = false;
    }
}
