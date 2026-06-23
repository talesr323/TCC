export default function admin(req, res, next) {
  if (req.usuario.tipo !== 'ADMIN') {
    return res.status(403).json({
      error: 'Acesso negado.',
      message: 'Esta rota exige privilégios de administrador.',
    });
  }

  next();
}
