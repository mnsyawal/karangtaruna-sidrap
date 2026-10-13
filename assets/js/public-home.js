
document.addEventListener("DOMContentLoaded", () => {
    
    loadBeritaTerbaru();
    loadKegiatanTerbaru();
    loadStatistik();
});

async function loadBeritaTerbaru() {
    const container = document.getElementById('beritaTerbaruContainer');
    if (!container) return;
    
    const response = await fetchAPI('getBerita', { limit: 3 }, true);
    
    container.innerHTML = ''; 

    if (!response || !response.data || response.data.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted">Belum ada berita yang dipublikasikan.</div>`;
        return;
    }

    let cardsHTML = '';
    response.data.forEach(berita => {
        const imgSrc = getImageUrl(berita.gambar);
        const ringkasanBersih = cleanExcerpt(berita.ringkasan || berita.isi, berita.judul, 130);
        cardsHTML += `
            <div class="col-md-4">
                <div class="card card-custom h-100">
                    <img src="${imgSrc}" class="card-img-top" alt="${escapeHtml(berita.judul)}" loading="lazy"
                         onerror="this.onerror=null; this.src=getImageUrl('');">
                    <div class="card-body">
                        <span class="badge-category mb-2">${escapeHtml(berita.kategori)}</span>
                        <h5 class="fw-bold mb-2 text-dark"><a href="detail-berita.html?id=${berita.id}" class="text-decoration-none text-dark stretched-link">${escapeHtml(berita.judul)}</a></h5>
                        <p class="text-muted small mb-3"><i class="fa-solid fa-calendar me-1"></i> ${formatTanggal(berita.tanggal)}</p>
                        <p class="text-muted small">${escapeHtml(ringkasanBersih)}</p>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = cardsHTML;
}

async function loadKegiatanTerbaru() {
    const container = document.getElementById('homeKegiatanContainer');
    if (!container) return;

    const res = await fetchAPI('getKegiatan', {}, true);

    if (!res || !res.success || !res.data || res.data.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">
                    Belum ada agenda kegiatan yang tercatat.
                </td>
            </tr>
        `;
        return;
    }

    const list = res.data.slice(0, 5);
    let rowsHTML = '';
    list.forEach((item, index) => {
        const waktuTeks = item.waktu || (item.tanggal ? formatTanggal(item.tanggal) : '-');
        rowsHTML += `
            <tr>
                <td class="text-center fw-bold" style="width: 50px;">${index + 1}</td>
                <td class="fw-semibold text-nowrap" style="width: 170px;">${escapeHtml(waktuTeks)}</td>
                <td>
                    <span class="fw-bold text-dark">${escapeHtml(item.jenis_kegiatan || '-')}</span>
                    ${item.lokasi ? `<div class="small text-muted"><i class="fa-solid fa-location-dot me-1 text-danger"></i>${escapeHtml(item.lokasi)}</div>` : ''}
                </td>
                <td style="width: 180px;">${escapeHtml(item.keterangan || '-')}</td>
                <td style="width: 160px;">${escapeHtml(item.pic || '-')}</td>
            </tr>
        `;
    });
    container.innerHTML = rowsHTML;
}

async function loadStatistik() {
    const response = await fetchAPI('getStatistik', {}, true);
    if (response && response.data) {
        const d = response.data;
        if (document.getElementById('statBerita')) document.getElementById('statBerita').innerText = (d.berita || 0) + '+';
        if (document.getElementById('statKegiatan')) document.getElementById('statKegiatan').innerText = (d.kegiatan || 0) + '+';
        if (document.getElementById('statDokumentasi')) document.getElementById('statDokumentasi').innerText = (d.dokumentasi || 0) + '+';
        if (document.getElementById('statArsip')) document.getElementById('statArsip').innerText = (d.arsip || 0) + '+';
        if (document.getElementById('statAnggota')) document.getElementById('statAnggota').innerText = (d.users || 0) + '+';
    }
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
