import jwt from "jsonwebtoken"

function auth(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: "Token não informado" })
  }

  const token = authHeader.split(" ")[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    req.usuario = decoded // ✅ PADRÃO CORRETO

    next()
  } catch (error) {
    return res.status(401).json({ error: "Token inválido" })
  }
}

export default auth