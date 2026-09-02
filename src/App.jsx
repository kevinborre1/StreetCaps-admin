import { useState, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import './App.css';

// --- Funciones Auxiliares para el Recorte ---
const readFile = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result), false);
    reader.readAsDataURL(file);
  });
};

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.9);
  });
}
// ---------------------------------------------

function App() {
  const [productos, setProductos] = useState([]);
  // NUEVO: Estado para las reseñas
  const [reseñas, setReseñas] = useState([]); 

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('New Era');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

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

  // NUEVO: Función para obtener reseñas
  const obtenerReseñas = async () => {
    try {
      // Uso localhost:8080. Si ya subiste la API a Render, cambialo por tu link de onrender
      const response = await fetch('http://localhost:8080/api/resenas');
      if (response.ok) {
        const data = await response.json();
        setReseñas(data.reverse()); // Reverse para ver las más nuevas arriba
      }
    } catch (error) {
      console.error('Error al cargar reseñas:', error);
    }
  };

  useEffect(() => {
    obtenerProductos();
    obtenerReseñas(); // NUEVO: Llamamos a las reseñas al cargar la página
  }, []);

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      let imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const uploadCroppedImage = async () => {
    setSubiendo(true);
    try {
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      const formData = new FormData();
      formData.append("file", croppedImageBlob);
      formData.append("upload_preset", "streetcaps_unsigned"); 

      const res = await fetch("https://api.cloudinary.com/v1_1/nxhnemnx/image/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (data.secure_url) {
        setImagenUrl(data.secure_url);
        setImageSrc(null); 
        alert("¡Foto recortada y subida con éxito!");
      }
    } catch (err) {
      console.error("Error al subir la imagen:", err);
      alert("Hubo un error al procesar la imagen.");
    } finally {
      setSubiendo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nuevoProducto = { nombre, tipo, precio: Number(precio), stock: Number(stock), imagenUrl };

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
    if (!window.confirm('¿Estás seguro de eliminar esta gorra?')) return;
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

  // NUEVO: Función para eliminar reseña
  const eliminarReseña = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta reseña?')) return;
    try {
      const response = await fetch(`http://localhost:8080/api/resenas/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        // Sacamos de la pantalla la reseña que acabamos de borrar en el backend
        setReseñas(reseñas.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Error al eliminar reseña:', error);
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">Panel de Administración - Street Caps</h1>

      {/* --- MODAL DE RECORTE --- */}
      {imageSrc && (
        <div className="cropper-modal">
          <h3 style={{ color: 'white', marginBottom: '15px' }}>Ajustá la foto (Formato 4:5)</h3>
          <div className="cropper-container">
            <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={4 / 5} onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
          </div>
          <input type="range" value={zoom} min={1} max={3} step={0.1} aria-labelledby="Zoom" onChange={(e) => setZoom(e.target.value)} style={{ width: '90%', maxWidth: '400px', marginTop: '15px' }} />
          <div className="cropper-controls">
            <button className="btn-cancel" onClick={() => setImageSrc(null)}>Cancelar</button>
            <button className="btn-confirm" onClick={uploadCroppedImage} disabled={subiendo}>
              {subiendo ? 'Subiendo...' : 'Confirmar Recorte'}
            </button>
          </div>
        </div>
      )}

      {/* Formulario de Carga */}
      <form onSubmit={handleSubmit} className="admin-form">
        <h3>Agregar Nueva Gorra</h3>
        <div className="form-grid">
          <input type="text" placeholder="Nombre (ej. Snapback Pro)" value={nombre} onChange={e => setNombre(e.target.value)} required className="form-input" />
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="form-input">
            <option value="New Era">New Era</option>
            <option value="Chrome Hearts">Chrome Hearts</option>
            <option value="Jordan">Jordan</option>
            <option value="Belicas">Belicas</option>
          </select>
          <input type="number" placeholder="Precio ($)" value={precio} min="0" onChange={e => { if (e.target.value === '' || Number(e.target.value) >= 0) setPrecio(e.target.value); }} required className="form-input" />
          <input type="number" placeholder="Stock disponible" value={stock} min="0" onChange={e => { if (e.target.value === '' || Number(e.target.value) >= 0) setStock(e.target.value); }} required className="form-input" />
          <div className="file-upload-container">
            <label>Foto de la Gorra:</label>
            <input type="file" accept="image/*" onChange={onFileChange} required={!imagenUrl} className="form-input" />
            {imagenUrl && (
              <div style={{ marginTop: '15px' }}>
                <p className="status-text success" style={{ marginBottom: '8px' }}>✓ Imagen recortada lista</p>
                <img src={imagenUrl} alt="Vista previa" style={{ width: '100px', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
              </div>
            )}
          </div>
        </div>
        <button type="submit" className="submit-btn" disabled={subiendo}>Guardar Gorra</button>
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
                <td data-label="Stock" className={p.stock > 0 ? 'stock-ok' : 'stock-low'}>{p.stock} un.</td>
                <td data-label="Acciones">
                  <button onClick={() => eliminarProducto(p.id)} className="delete-btn">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* NUEVO: Tabla de Gestión de Reseñas */}
      <h3 className="table-title" style={{ marginTop: '3rem' }}>Gestión de Reseñas</h3>
      <div className="table-responsive">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Comentario</th>
              <th>Estrellas</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reseñas.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '1rem' }}>No hay reseñas cargadas.</td>
              </tr>
            ) : (
              reseñas.map(r => (
                <tr key={r.id}>
                  <td data-label="ID">{r.id}</td>
                  <td data-label="Nombre">{r.nombre}</td>
                  <td data-label="Comentario">"{r.comentario}"</td>
                  <td data-label="Estrellas">{r.estrellas} ★</td>
                  <td data-label="Fecha">{r.fecha}</td>
                  <td data-label="Acciones">
                    <button onClick={() => eliminarReseña(r.id)} className="delete-btn">Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

export default App;