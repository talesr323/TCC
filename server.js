import dotenv from "dotenv"
dotenv.config()

import express from "express"

import usuariosRoutes from "./src/routes/usuarios.js"
import authRoutes from "./src/routes/auth.js"
import fichasRoutes from "./src/routes/fichas.js"
import exerciciosRoutes from "./src/routes/exercicios.js"
import gruposRoutes from "./src/routes/grupos.js"
import setupRoutes from "./src/routes/academia.js"

import auth from "./src/middlewares/auth.js" // 🔥 IMPORTANTE

BigInt.prototype.toJSON = function () {
  return this.toString()
}

const app = express()

app.use(express.json())

// =======================
// 🔓 ROTAS PÚBLICAS
// =======================
app.use("/api", setupRoutes)   // setup inicial (SEM TOKEN)
app.use("/auth", authRoutes)   // login (SEM TOKEN)

// =======================
// 🔒 MIDDLEWARE GLOBAL
// =======================
app.use(auth) // 🔥 AQUI começa a proteção

// =======================
// 🔒 ROTAS PROTEGIDAS
// =======================
app.use("/usuarios", usuariosRoutes)
app.use("/fichas", fichasRoutes)
app.use("/exercicios", exerciciosRoutes)
app.use("/grupos", gruposRoutes)

app.listen(3001, '0.0.0.0', () => {
  console.log('Servidor rodando na porta 3001')
})