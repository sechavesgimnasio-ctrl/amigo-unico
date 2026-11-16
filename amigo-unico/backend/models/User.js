// Modelo de cliente. La clave se guarda siempre cifrada (hash), nunca en texto normal.
import mongoose from 'mongoose';

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
  clave: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('User', usuarioSchema);
