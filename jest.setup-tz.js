// Todos los tests corren con la hora de Chile, para probar el cambio de horario.
// Va en globalSetup porque la zona horaria debe fijarse antes de que arranquen los tests.
module.exports = () => {
  process.env.TZ = 'America/Santiago';
};
