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
    }, 'image/jpeg', 0.9); // 0.9 es para buena calidad con peso ligero
  });
}
// ---------------------------------------------

function App() {
  const [productos, setProductos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Snapback');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [subiendo, setSubiendo] = useState(false);

  // Estados del Recortador
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

  useEffect(() => {
    obtenerProductos();
  }, []);

  // 1. El usuario selecciona la foto y abrimos el modal
  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      let imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl); // Esto abre el modal de recorte
    }
  };

  // 2. Guarda las coordenadas mientras el usuario mueve el mouse
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 3. El usuario confirma el recorte y lo subimos a Cloudinary
  const uploadCroppedImage = async () => {
    setSubiendo(true);
    try {
      // Extraemos el pedazo de foto recortado
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);

      const formData = new FormData();
      formData.append("file", croppedImageBlob);
      formData.append("upload_preset", "streetcaps_unsigned"); // Tu preset de Cloudinary

      const res = await fetch("https://api.cloudinary.com/v1_1/nxhnemnx/image/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (data.secure_url) {
        setImagenUrl(data.secure_url);
        setImageSrc(null); // Cerramos el modal
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

      {/* --- MODAL DE RECORTE --- */}
      {imageSrc && (
        <div className="cropper-modal">
          <h3 style={{ color: 'white', marginBottom: '15px' }}>Ajustá la foto (Formato 4:5)</h3>
          <div className="cropper-container">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={4 / 5} /* Aquí fijamos la proporción recomendada */
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          {/* Control deslizante para el zoom */}
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(e.target.value)}
            style={{ width: '90%', maxWidth: '400px', marginTop: '15px' }}
          />

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
          <input
            type="number"
            placeholder="Precio ($)"
            value={precio}
            min="0"
            onChange={e => {
              if (e.target.value === '' || Number(e.target.value) >= 0) {
                setPrecio(e.target.value);
              }
            }}
            required
            className="form-input"
          />

          <input
            type="number"
            placeholder="Stock disponible"
            value={stock}
            min="0"
            onChange={e => {
              if (e.target.value === '' || Number(e.target.value) >= 0) {
                setStock(e.target.value);
              }
            }}
            required
            className="form-input"
          />
          <div className="file-upload-container">
            <label>Foto de la Gorra:</label>
            <input type="file" accept="image/*" onChange={onFileChange} required={!imagenUrl} className="form-input" />

            {/* Vista previa pequeña en el formulario */}
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
    </div>
  );
}

export default App;