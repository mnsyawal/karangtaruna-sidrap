
let semuaKegiatan = [];

document.addEventListener("DOMContentLoaded", () => {
    loadKegiatan();

    const searchInput = document.getElementById('searchKegiatan');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            filterKegiatan(query);
        });
    }
});

async function loadKegiatan() {
    const tbody = document.getElementById('tableKegiatanBody');
    if (!tbody) return;

    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-4 text-muted">
                <div class="spinner-border spinner-border-sm text-success me-2" role="status"></div>
                Memuat daftar kegiatan...
            </td>
        </tr>
    `;

    const res = await fetchAPI('getKegiatan', {}, true);

    if (res && res.success && Array.isArray(res.data)) {
        semuaKegiatan = res.data;
        renderTableKegiatan(semuaKegiatan);
    } else {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">
                    Belum ada agenda atau kegiatan yang tercatat.
                </td>
            </tr>
        `;
    }
}

function renderTableKegiatan(data) {
    const tbody = document.getElementById('tableKegiatanBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">
                    Tidak ada kegiatan yang sesuai dengan pencarian.
                </td>
            </tr>
        `;
        return;
    }

    data.forEach((item, index) => {
        const no = index + 1;
        const waktuTeks = item.waktu || (item.tanggal ? formatTanggal(item.tanggal) : '-');
        const jenisKegiatan = escapeHtml(item.jenis_kegiatan || '-');
        const keterangan = escapeHtml(item.keterangan || '-');
        const pic = escapeHtml(item.pic || '-');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="text-center fw-bold" style="width: 60px;">${no}</td>
            <td class="fw-semibold text-nowrap" style="width: 170px;">${waktuTeks}</td>
            <td>
                <span class="fw-bold text-dark">${jenisKegiatan}</span>
                ${item.lokasi ? `<div class="small text-muted"><i class="fa-solid fa-location-dot me-1 text-danger"></i>${escapeHtml(item.lokasi)}</div>` : ''}
            </td>
            <td>${keterangan}</td>
            <td class="fw-medium">${pic}</td>
        `;
        tbody.appendChild(tr);
    });
}

function filterKegiatan(query) {
    if (!query) {
        renderTableKegiatan(semuaKegiatan);
        return;
    }

    const filtered = semuaKegiatan.filter(item => {
        const jenis = (item.jenis_kegiatan || '').toLowerCase();
        const ket = (item.keterangan || '').toLowerCase();
        const pic = (item.pic || '').toLowerCase();
        const waktu = (item.waktu || '').toLowerCase();
        const lokasi = (item.lokasi || '').toLowerCase();

        return jenis.includes(query) || ket.includes(query) || pic.includes(query) || waktu.includes(query) || lokasi.includes(query);
    });

    renderTableKegiatan(filtered);
}
