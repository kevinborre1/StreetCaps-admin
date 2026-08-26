import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [productos, setProductos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Snapback');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSubiendo(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "streetcaps_unsigned");

    try {
      const res = await fetch("https://streetcapsapi.onrender.com/api/productos", {
        method: "POST",
        body: formData
      });
      const data = await res.json();

      if (data.secure_url) {
        setImagenUrl(data.secure_url);
        alert("¡Foto subida con éxito!");
      }
    } catch (err) {
      console.error("Error al subir la imagen:", err);
    } finally {
      setSubiendo(false);
    }
  };

  const obtenerProductos = async () => {
    try {
      const response = await fetch('https://streetcapsapi.onrender.com/api/productos');
      if (response.ok) {
        const data = await response.json();
        setProductos(data);
      }
    } catch (error) {
      console.error('Error al conectar con la API:', error);
    }
  };

  useEffect(() => {
    obtenerProductos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nuevoProducto = {
      nombre,
      tipo,
      precio: Number(precio),
      stock: Number(stock),
      imagenUrl
    };

    try {
      const response = await fetch('https://streetcapsapi.onrender.com/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoProducto)
      });

      if (response.ok) {
        alert('¡Gorra agregada con éxito!');
        setNombre('');
        setPrecio('');
        setStock('');
        setImagenUrl('');
        obtenerProductos();
      }
    } catch (error) {
      console.error('Error al guardar el producto:', error);
    }
  };

  const eliminarProducto = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta gorra?')) return;

    try {
      const response = await fetch(`https://streetcapsapi.onrender.com/api/productos/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProductos(productos.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Panel de Administración - Street Caps</h1>

      {/* Formulario de Carga */}
      <form onSubmit={handleSubmit} className="admin-form">
        <h3>Agregar Nueva Gorra</h3>
        <div className="form-grid">
          <input 
            type="text" 
            placeholder="Nombre (ej. Snapback Pro)" 
            value={nombre} 
            onChange={e => setNombre(e.target.value)} 
            required 
            className="form-input"
          />
          <select 
            value={tipo} 
            onChange={e => setTipo(e.target.value)} 
            className="form-input"
          >
            <option value="Snapback">Snapback</option>
            <option value="Trucker">Trucker</option>
            <option value="Fitted">Fitted</option>
            <option value="Dad Hat">Dad Hat</option>
          </select>
          <input 
            type="number" 
            placeholder="Precio ($)" 
            value={precio} 
            onChange={e => setPrecio(e.target.value)} 
            required 
            className="form-input"
          />
          <input 
            type="number" 
            placeholder="Stock disponible" 
            value={stock} 
            onChange={e => setStock(e.target.value)} 
            required 
            className="form-input"
          />
          <div className="file-upload-container">
            <label>Foto de la Gorra:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              required={!imagenUrl}
              className="form-input"
            />
            {subiendo && <p className="status-text loading">Subiendo imagen a la nube...</p>}
            {imagenUrl && <p className="status-text success">✓ Imagen cargada correctamente</p>}
          </div>
        </div>
        <button type="submit" className="submit-btn" disabled={subiendo}>
          {subiendo ? 'Subiendo...' : 'Guardar Gorra'}
        </button>
      </form>

      {/* Tabla de Control de Stock */}
      <h3 className="table-title">Inventario Actual y Stock</h3>
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map(p => (
              <tr key={p.id}>
                <td data-label="ID">{p.id}</td>
                <td data-label="Nombre">{p.nombre}</td>
                <td data-label="Tipo">{p.tipo}</td>
                <td data-label="Precio">${p.precio.toLocaleString("es-AR")}</td>
                <td data-label="Stock" className={p.stock > 0 ? 'stock-ok' : 'stock-low'}>
                  {p.stock} un.
                </td>
                <td data-label="Acciones">
                  <button onClick={() => eliminarProducto(p.id)} className="delete-btn">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;