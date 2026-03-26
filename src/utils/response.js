function sendData(res, statusCode, data) {
  return res.status(statusCode).json({ status: 'success', data });
}

function sendMessage(res, statusCode, message) {
  return res.status(statusCode).json({ status: 'success', message });
}

module.exports = {
  sendData,
  sendMessage,
};
