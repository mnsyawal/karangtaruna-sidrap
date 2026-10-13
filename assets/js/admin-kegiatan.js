
let kegiatanData = [];
let isEditMode = false;
let userRole = 'USER';

document.addEventListener("DOMContentLoaded", () => {
    
    const btnToggle = document.getElementById('btnToggleSidebar');
    if (btnToggle) {
        btnToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('show');
            document.getElementById('sidebarOverlay').classList.add('show');
        });
    }

    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', () => {
            document.getElementById('sidebar').classList.remove('show');
            document.getElementById('sidebarOverlay').classList.remove('show');
        });
    }

    const userStr = localStorage.getItem('KT_USER');
    if (userStr) {
        const userObj = JSON.parse(userStr);
        userRole = userObj.role || 'USER';
    }

    loadTableKegiatan();

    const searchInput = document.getElementById('adminSearchKegiatan');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderTable(kegiatanData);
                return;
            }
            const filtered = kegiatanData.filter(item => {
                const jenis = (item.jenis_kegiatan || '').toLowerCase();
                const ket = (item.keterangan || '').toLowerCase();
                const pic = (item.pic || '').toLowerCase();
                const waktu = (item.waktu || '').toLowerCase();
                const creator = (item.created_by || '').toLowerCase();
                return jenis.includes(query) || ket.includes(query) || pic.includes(query) || waktu.includes(query) || creator.includes(query);
            });
            renderTable(filtered);
        });
    }

    const form = document.getElementById('formKegiatan');
    if (form) {
        form.addEventListener('submit', handleSaveKegiatan);
    }
});

async function loadTableKegiatan() {
    const tbody = document.getElementById('tableKegiatanAdminBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                <i class="fa-solid fa-circle-notch fa-spin text-success me-1"></i> Memuat data kegiatan...
            </td>
        </tr>
    `;

    const res = await fetchAPI('getAdminKegiatan', {}, false);

    if (res && res.success && Array.isArray(res.data)) {
        kegiatanData = res.data;
        renderTable(kegiatanData);
    } else {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-danger">
                    Gagal memuat data kegiatan.
                </td>
            </tr>
        `;
    }
}

function renderTable(data) {
    const tbody = document.getElementById('tableKegiatanAdminBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    Belum ada data kegiatan tercatat. Klik "Tambah Kegiatan" untuk menambahkan.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach((item, index) => {
        const no = index + 1;
        const waktuTeks = item.waktu || (item.tanggal ? formatTanggal(item.tanggal) : '-');
        const jenis = escapeHtml(item.jenis_kegiatan || '-');
        const keterangan = escapeHtml(item.keterangan || '-');
        const pic = escapeHtml(item.pic || '-');
        const penginput = escapeHtml(item.created_by || '-');

        let actionButtons = `
            <button class="btn btn-sm btn-primary me-1" onclick="editKegiatan('${item.id}')" title="Edit Kegiatan">
                <i class="fa-solid fa-edit"></i>
            </button>
        `;

        if (userRole === 'ADMIN') {
            actionButtons += `
                <button class="btn btn-sm btn-danger" onclick="deleteKegiatan('${item.id}')" title="Hapus Kegiatan">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center fw-bold">${no}</td>
            <td class="fw-semibold text-nowrap">${waktuTeks}</td>
            <td>
                <span class="fw-bold text-dark">${jenis}</span>
                ${item.lokasi ? `<div class="small text-muted"><i class="fa-solid fa-location-dot me-1 text-danger"></i>${escapeHtml(item.lokasi)}</div>` : ''}
            </td>
            <td>${keterangan}</td>
            <td>${pic}</td>
            <td><span class="badge bg-light text-dark border">${penginput}</span></td>
            <td class="text-end">${actionButtons}</td>
        `;
        tbody.appendChild(tr);
    });
}

function showForm() {
    isEditMode = false;
    const form = document.getElementById('formKegiatan');
    if (form) form.reset();

    document.getElementById('kegiatanId').value = '';
    document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
    document.getElementById('statusKegiatan').value = 'Aktif';

    document.getElementById('formTitle').innerText = 'Tambah Kegiatan Baru';
    document.getElementById('viewList').classList.add('d-none');
    document.getElementById('viewForm').classList.remove('d-none');
}

function hideForm() {
    document.getElementById('viewForm').classList.add('d-none');
    document.getElementById('viewList').classList.remove('d-none');
}

function editKegiatan(id) {
    const item = kegiatanData.find(k => k.id === id);
    if (!item) return;

    isEditMode = true;
    document.getElementById('kegiatanId').value = item.id;
    document.getElementById('waktu').value = item.waktu || '';
    document.getElementById('tanggal').value = item.tanggal ? item.tanggal.split('T')[0] : '';
    document.getElementById('jenis_kegiatan').value = item.jenis_kegiatan || '';
    document.getElementById('keterangan').value = item.keterangan || '';
    document.getElementById('pic').value = item.pic || '';
    document.getElementById('lokasi').value = item.lokasi || '';
    document.getElementById('statusKegiatan').value = item.status || 'Aktif';

    document.getElementById('formTitle').innerText = 'Edit Kegiatan';
    document.getElementById('viewList').classList.add('d-none');
    document.getElementById('viewForm').classList.remove('d-none');
}

async function handleSaveKegiatan(e) {
    e.preventDefault();

    const btn = document.getElementById('btnSaveKegiatan');
    const originalText = btn.innerHTML;

    const id = document.getElementById('kegiatanId').value;
    const waktu = document.getElementById('waktu').value.trim();
    const tanggal = document.getElementById('tanggal').value;
    const jenis = document.getElementById('jenis_kegiatan').value.trim();
    const keterangan = document.getElementById('keterangan').value.trim();
    const pic = document.getElementById('pic').value.trim();
    const lokasi = document.getElementById('lokasi').value.trim();
    const status = document.getElementById('statusKegiatan').value;

    if (!jenis) {
        Swal.fire('Peringatan', 'Jenis kegiatan wajib diisi.', 'warning');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-1"></i> Menyimpan...`;

    let waktuFinal = waktu;
    if (!waktuFinal && tanggal) {
        waktuFinal = formatTanggal(tanggal);
    }

    const payload = {
        id: id,
        waktu: waktuFinal,
        tanggal: tanggal,
        jenis_kegiatan: jenis,
        keterangan: keterangan,
        pic: pic,
        lokasi: lokasi,
        status: status
    };

    const action = isEditMode ? 'updateKegiatan' : 'createKegiatan';

    try {
        const res = await postAPI(action, payload, true);

        if (res && res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Berhasil!',
                text: res.message || 'Data kegiatan berhasil disimpan.',
                timer: 1500,
                showConfirmButton: false
            });

            localStorage.removeItem('KT_CACHE_getKegiatan_{}');

            hideForm();
            loadTableKegiatan();
        } else {
            Swal.fire('Gagal', res.message || 'Terjadi kesalahan sistem.', 'error');
        }
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Gagal memproses data.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function deleteKegiatan(id) {
    const result = await Swal.fire({
        title: 'Hapus Kegiatan?',
        text: 'Data kegiatan yang dihapus tidak dapat dikembalikan.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        Swal.fire({
            title: 'Menghapus...',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false
        });

        const res = await postAPI('deleteKegiatan', { id: id }, true);

        if (res && res.success) {
            Swal.fire({
                icon: 'success',
                title: 'Terhapus!',
                text: 'Kegiatan berhasil dihapus.',
                timer: 1500,
                showConfirmButton: false
            });

            localStorage.removeItem('KT_CACHE_getKegiatan_{}');
            loadTableKegiatan();
        } else {
            Swal.fire('Gagal', res.message || 'Gagal menghapus kegiatan.', 'error');
        }
    }
}
