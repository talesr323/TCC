export default function admin(req, res, next) {

  if (req.usuario.tipo !== "ADMIN") {
    return res.status(403).json({
      error: "Acesso restrito ao admin."
    })
  }

  next()

}