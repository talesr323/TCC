const express = require("express");
require("dotenv").config();
const app = express();

app.use(express.json());

app.use("/auth", require("./src/routes/auth"));
app.use("/admin", require("./src/routes/admin"));
app.use("/usuarios", require("./src/routes/usuarios"));
app.use("/exercicios", require("./src/routes/exercicio"));
app.use("/grupos-musculares", require("./src/routes/grupoMuscular"));
app.use("/fichas", require("./src/routes/ficha"));

app.listen(3001, () => {
  console.log("Servidor rodando na porta 3001");
});