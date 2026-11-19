// Modelo de producto: define qué campos guarda MongoDB y cómo se validan.
import mongoose from 'mongoose';

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 100 },
  descripcion: { type: String, default: '', trim: true, maxlength: 500 },
  precio: { type: Number, default: null, min: 0 }, // precio base
  precios: { // precio por talla; si una talla queda vacía se usa el precio base
    S: { type: Number, default: null, min: 0 },
    M: { type: Number, default: null, min: 0 },
    L: { type: Number, default: null, min: 0 },
    XL: { type: Number, default: null, min: 0 }
  },
  icono: { type: String, default: 'fa-paw' },
  imagen: { type: String, default: '', maxlength: 350000 }, // foto reducida, guardada como texto (data URL)
  activo: { type: Boolean, default: true }
});

export default mongoose.model('Product', productoSchema);
