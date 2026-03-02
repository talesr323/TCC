module.exports = function onlyAdmin(req, res, next) {
  if (!req.user || req.user.tipo !== "ADMIN") {
    return res.status(403).json({ error: "Acesso restrito ao ADMIN" });
  }
  next();
};