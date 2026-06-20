import dotenv from 'dotenv';
dotenv.config();

import express from 'express';

import adminRoutes from './src/routes/admin.js';
import authRoutes from './src/routes/auth.js';
import conquistasRoutes from './src/routes/conquistas.js';
import executaFichaRoutes from './src/routes/executaFicha.js';
import exerciciosRoutes from './src/routes/exercicios.js';
import fichasRoutes from './src/routes/fichas.js';
import gruposRoutes from './src/routes/grupos.js';
import rankingRoutes from './src/routes/ranking.js';
import usuariosRoutes from './src/routes/usuarios.js';

import auth from './src/middlewares/auth.js'; //Importante

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();

app.use(express.json());

// =======================
// 🔓 ROTAS PÚBLICAS
// =======================
app.use('/admin', adminRoutes); // setup inicial (SEM TOKEN)
app.use('/auth', authRoutes); // login (SEM TOKEN)

// =======================
// 🔒 MIDDLEWARE GLOBAL
// =======================
app.use(auth); // 🔥 AQUI começa a proteção

// =======================
// 🔒 ROTAS PROTEGIDAS
// =======================
app.use('/conquistas', conquistasRoutes);
app.use('/execucao-ficha', executaFichaRoutes);
app.use('/exercicios', exerciciosRoutes);
app.use('/fichas', fichasRoutes);
app.use('/grupos', gruposRoutes);
app.use('/ranking', rankingRoutes);
app.use('/usuarios', usuariosRoutes);

app.listen(3001, '0.0.0.0', () => {
  console.log('Servidor rodando na porta 3001');
});
