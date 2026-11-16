// Conexión a MongoDB Atlas y carga inicial de productos.
import mongoose from 'mongoose';
import Product from './models/Product.js';

export async function conectar() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB conectado');

  // Si no hay productos, cargamos los iniciales
  if ((await Product.countDocuments()) === 0) {
    await Product.insertMany([
      { nombre: 'Chaquetas de Cuerina', descripcion: 'Toque rockero y moderno con máxima durabilidad y estilo.', icono: 'fa-vest' },
      { nombre: 'Enterizos de Licra', descripcion: 'Cómodos, flexibles y frescos para moverse con libertad.', icono: 'fa-shirt' },
      { nombre: 'Pijamas', descripcion: 'Suaves y abrigadas para dulces sueños toda la noche.', icono: 'fa-moon' },
      { nombre: 'Chaquetas Piloto', descripcion: 'Abrigo con diseño aviador clásico que nunca pasa de moda.', icono: 'fa-plane' },
      { nombre: 'Esmoquin', descripcion: 'Elegancia para bodas, fiestas y eventos especiales.', icono: 'fa-user-tie' }
    ]);
    console.log('Productos iniciales cargados');
  }
}
