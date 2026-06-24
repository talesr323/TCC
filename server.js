import dotenv from 'dotenv';
dotenv.config();

import express from 'express';

import adminRoute from './src/routes/adminRoute.js';
import authRoute from './src/routes/authRoute.js';
import conquistasRoute from './src/routes/conquistasRoute.js';
import exerciciosRoute from './src/routes/exerciciosRoute.js';
import fichaExecucaoRoute from './src/routes/fichaExecucaoRoute.js';
import fichasRoute from './src/routes/fichasRoute.js';
import gruposTreinoRoute from './src/routes/gruposTreinoRoute.js';
import usuariosRoute from './src/routes/usuariosRoute.js';
import auth from './src/middlewares/auth.js'; //Importante

BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  console.log('REQUISIÇÃO:', req.method, req.originalUrl);
  next();
});

//Rotas Públicas
app.use('/admin', adminRoute);
app.use('/auth', authRoute);

app.use('/conquistas', auth, conquistasRoute);
app.use('/exercicios', auth, exerciciosRoute);
app.use('/ficha-execucao', auth, fichaExecucaoRoute);
app.use('/fichas', auth, fichasRoute);
app.use('/grupos-treino', auth, gruposTreinoRoute);
app.use('/usuarios', auth, usuariosRoute);

app.listen(3001, '0.0.0.0', () => {
  console.log('Servidor rodando na porta 3001');
});
