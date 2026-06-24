import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
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

app.use(cors());
app.use(express.json());

//Rotas Públicas
app.use('/admin', adminRoute); //Inicialização do aplicativo (sem token)
app.use('/auth', authRoute); // Login (sem token)

app.use(auth); //proteção

//Rotas Protegidas
app.use('/conquistas', conquistasRoute);
app.use('/exercicios', exerciciosRoute);
app.use('/ficha-execucao', fichaExecucaoRoute);
app.use('/fichas', fichasRoute);
app.use('/grupos-treino', gruposTreinoRoute);
app.use('/usuarios', usuariosRoute);

app.listen(3001, '0.0.0.0', () => {
  console.log('Servidor rodando na porta 3001');
});
