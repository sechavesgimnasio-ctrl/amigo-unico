// Modelo de pedido: se guarda cuando un cliente pulsa "Pedir por WhatsApp" en la tienda.
import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  talla: { type: String, enum: ['S', 'M', 'L', 'XL'], required: true },
  cantidad: { type: Number, required: true, min: 1, max: 20 },
  precio: { type: Number, default: null } // precio unitario tomado de la base de datos
}, { _id: false });

const pedidoSchema = new mongoose.Schema({
  items: { type: [itemSchema], required: true },
  total: { type: Number, default: 0 },
  precioIncompleto: { type: Boolean, default: false }, // true si alguna prenda no tiene precio
  cliente: { nombre: { type: String, default: '' }, email: { type: String, default: '' } },
  atendido: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Order', pedidoSchema);
