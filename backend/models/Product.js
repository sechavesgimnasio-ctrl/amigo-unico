// Modelo de producto: define qué campos guarda MongoDB y cómo se validan.
import mongoose from 'mongoose';

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 100 },
  descripcion: { type: String, default: '', trim: true, maxlength: 500 },
  precio: { type: Number, default: null, min: 0 },
  icono: { type: String, default: 'fa-paw' },
  activo: { type: Boolean, default: true }
});

export default mongoose.model('Product', productoSchema);
