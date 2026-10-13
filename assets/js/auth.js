
function checkAuth() {
    const token = localStorage.getItem('KT_TOKEN');
    if (!token) {
        
        window.location.replace('login.html');
        return false;
    }
    return true;
}

function checkRole(allowedRoles) {
    const userString = localStorage.getItem('KT_USER');
    if (userString) {
        const user = JSON.parse(userString);
        if (!allowedRoles.includes(user.role)) {
            Swal.fire('Akses Ditolak', 'Anda tidak memiliki hak akses ke halaman ini.', 'error')
            .then(() => {
                window.location.replace('index.html');
            });
            document.body.style.display = 'none'; 
        }
    }
}

function logout() {
    Swal.fire({
        title: 'Logout?',
        text: 'Anda akan keluar dari panel admin.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#166534',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Ya, Keluar'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('KT_TOKEN');
            localStorage.removeItem('KT_USER');
            window.location.replace('login.html');
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const userNameDisplay = document.getElementById('adminUserName');
    const userRoleDisplay = document.getElementById('adminUserRole');
    
    if (userNameDisplay) {
        const userString = localStorage.getItem('KT_USER');
        if (userString) {
            const user = JSON.parse(userString);
            userNameDisplay.innerText = user.nama || user.username;
            if(userRoleDisplay) userRoleDisplay.innerText = user.role;
        }
    }

    const btnToggle = document.getElementById('btnToggleSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebar = document.getElementById('sidebar');
    if (btnToggle && overlay && sidebar) {
        btnToggle.addEventListener('click', () => {
            sidebar.classList.add('show');
            overlay.classList.add('show');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        });
    }
});
