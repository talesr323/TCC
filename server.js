const express = require("express");
require("dotenv").config();
const app = express();

app.use(express.json());

app.use("/auth", require("./src/routes/auth"));
app.use("/admin", require("./src/routes/admin"));
app.use("/usuarios", require("./src/routes/usuarios"));

app.listen(3001, () => {
  console.log("Servidor rodando na porta 3001");
});