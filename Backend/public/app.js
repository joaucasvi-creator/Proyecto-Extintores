// Validar si hay token al entrar a la página
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html'; // Si no hay token, lo regresamos al login
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Función para cargar los extintores en la tabla
async function cargarExtintores() {
    const response = await fetch('/api/extintores');
    const extintores = await response.json();
    
    const tbody = document.querySelector('#tablaExtintores tbody');
    tbody.innerHTML = ''; // Limpiar tabla

    extintores.forEach(ext => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ext.id}</td>
            <td>${ext.tipo}</td>
            <td>${ext.capacidad}</td>
            <td>${ext.YearFabricacion}</td>
            <td>${ext.estado}</td>
            <td>
                <button class="btn-danger" onclick="eliminarExtintor(${ext.id})">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Función para agregar un extintor (Protegida con Token)
async function agregarExtintor() {
    const tipo = document.getElementById('tipo').value;
    const capacidad = document.getElementById('capacidad').value;
    const YearFabricacion = document.getElementById('year').value;

    if (!tipo || !capacidad || !YearFabricacion) {
        alert('Por favor, llena todos los campos');
        return;
    }

    try {
        const response = await fetch('/api/extintores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // AQUÍ ENVIAMOS EL TOKEN
            },
            body: JSON.stringify({ tipo, capacidad, YearFabricacion })
        });

        if (response.ok) {
            // Limpiar inputs
            document.getElementById('tipo').value = '';
            document.getElementById('capacidad').value = '';
            document.getElementById('year').value = '';
            cargarExtintores(); // Recargar tabla
        } else {
            const data = await response.json();
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error al agregar:', error);
    }
}

// Función para eliminar (Protegida con Token)
async function eliminarExtintor(id) {
    if (!confirm('¿Seguro que quieres eliminar este extintor?')) return;

    try {
        const response = await fetch(`/api/extintores/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}` // AQUÍ ENVIAMOS EL TOKEN
            }
        });

        if (response.ok) {
            cargarExtintores(); // Recargar tabla
        } else {
            alert('Error al eliminar. ¿Tu sesión expiró?');
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
    }
}

// Cargar los datos apenas se abra la página
cargarExtintores();