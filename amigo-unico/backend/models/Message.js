// Modelo de mensaje del formulario de contacto.
import mongoose from 'mongoose';

const mensajeSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 80 },
  contacto: { type: String, default: '', trim: true, maxlength: 120 },
  mensaje: { type: String, required: true, trim: true, maxlength: 1000 },
  leido: { type: Boolean, default: false }
}, { timestamps: true }); // agrega createdAt y updatedAt automáticamente

export default mongoose.model('Message', mensajeSchema);
