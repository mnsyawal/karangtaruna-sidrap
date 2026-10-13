
document.addEventListener("DOMContentLoaded", () => {
    
    const urlParams = new URLSearchParams(window.location.search);
    const idBerita = urlParams.get('id');

    if (!idBerita) {
        Swal.fire('Error', 'ID Berita tidak ditemukan', 'error').then(() => {
            window.location.href = 'berita.html';
        });
        return;
    }

    loadDetailBerita(idBerita);
});

async function loadDetailBerita(id) {
    const loadingUI = document.getElementById('loadingDetail');
    const contentUI = document.getElementById('contentDetail');

    const response = await fetchAPI('getBeritaById', { id: id }, false);

    if (!response || !response.success || !response.data) {
        loadingUI.innerHTML = `<div class="text-center text-muted">Maaf, berita tidak ditemukan.</div>`;
        return;
    }

    const data = response.data;

    document.title = `${data.judul} - Karang Taruna`;
    document.getElementById('detKategori').innerText = data.kategori;
    document.getElementById('detJudul').innerText = data.judul;
    document.getElementById('detTanggal').innerText = formatTanggal(data.tanggal);
    if (/<[a-z][\s\S]*>/i.test(data.isi)) {
        document.getElementById('detIsi').innerHTML = data.isi;
    } else {
        document.getElementById('detIsi').innerHTML = (data.isi || '').replace(/\n/g, '<br>');
    }
    if (data.gambar) {
        document.getElementById('detGambar').src = getImageUrl(data.gambar);
    } else {
        document.getElementById('detGambar').style.display = 'none';
    }

    loadingUI.classList.add('d-none');
    contentUI.classList.remove('d-none');
}

function shareWA() {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(document.getElementById('detJudul').innerText);
    window.open(`https://api.whatsapp.com/send?text=${text}%20-%20Baca%20selengkapnya%20di:%20${url}`);
}

function shareFB() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
}

function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'Link berita disalin ke clipboard!',
            timer: 1500,
            showConfirmButton: false
        });
    });
}
