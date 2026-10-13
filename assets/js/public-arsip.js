
let allArsipData = []; 
let currentArsipPage = 1;
const itemsPerPage = 10;

document.addEventListener("DOMContentLoaded", () => {
    initArsip();

    document.getElementById('searchArsip').addEventListener('input', (e) => {
        const keyword = e.target.value.toLowerCase();
        const filteredData = allArsipData.filter(item => 
            (item.nomor_surat && item.nomor_surat.toLowerCase().includes(keyword)) ||
            (item.perihal && item.perihal.toLowerCase().includes(keyword))
        );
        currentArsipPage = 1;
        renderArsipTable(filteredData, currentArsipPage);
    });
});

async function initArsip() {
    const container = document.getElementById('arsipContainer');
    
    const response = await fetchAPI('getArsip', { page: 1, limit: 1000 }, true);
    
    if (!response || !response.data || response.data.length === 0) {
        container.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada arsip tersedia.</td></tr>`;
        return;
    }

    allArsipData = response.data;
    renderArsipTable(allArsipData, currentArsipPage);
}

function renderArsipTable(data, page) {
    const container = document.getElementById('arsipContainer');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Arsip tidak ditemukan.</td></tr>`;
        document.getElementById('paginationArsip').innerHTML = '';
        return;
    }

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);
    const totalPages = Math.ceil(data.length / itemsPerPage);

    paginatedData.forEach((item, index) => {
        const noUrl = item.file_url ? false : true;
        
        let actionBtn = `<button class="btn btn-sm btn-secondary" disabled><i class="fa-solid fa-ban"></i> File Kosong</button>`;
        
        if (!noUrl) {
            actionBtn = `<a href="${item.file_url}" target="_blank" class="btn btn-sm btn-success text-white"><i class="fa-solid fa-download"></i> Unduh / Lihat</a>`;
        }

        const row = `
            <tr>
                <td class="fw-bold">${item.nomor_surat || '-'}</td>
                <td>${item.perihal || '-'}</td>
                <td><span class="badge ${item.jenis === 'Masuk' ? 'bg-info' : 'bg-warning text-dark'}">${item.jenis || '-'}</span></td>
                <td>${formatTanggal(item.tanggal)}</td>
                <td class="text-center">${actionBtn}</td>
            </tr>
        `;
        container.innerHTML += row;
    });

    renderArsipPagination(totalPages, page, data);
}

function renderArsipPagination(totalPages, currentPage, currentData) {
    const paginationEl = document.getElementById('paginationArsip');
    let html = '';

    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link text-success" onclick="goToArsipPage(${currentPage - 1})">Prev</button>
             </li>`;
    
    for (let i = 1; i <= totalPages; i++) {
        html += `<li class="page-item ${currentPage === i ? 'active' : ''}">
                    <button class="page-link ${currentPage === i ? 'bg-success border-success text-white' : 'text-success'}" onclick="goToArsipPage(${i})">${i}</button>
                 </li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link text-success" onclick="goToArsipPage(${currentPage + 1})">Next</button>
             </li>`;

    paginationEl.innerHTML = html;
}

window.goToArsipPage = function(page) {
    currentArsipPage = page;
    const keyword = document.getElementById('searchArsip').value.toLowerCase();
    
    const filteredData = allArsipData.filter(item => 
        (item.nomor_surat && item.nomor_surat.toLowerCase().includes(keyword)) ||
        (item.perihal && item.perihal.toLowerCase().includes(keyword))
    );
    
    renderArsipTable(filteredData, currentArsipPage);
}
