const axios = require('axios');

const RT_SERVICE_URL = process.env.RT_SERVICE_URL;
const INTERNAL_RPC_TOKEN = process.env.INTERNAL_RPC_TOKEN;

exports.publishEvent = async (payload) => {
  if (!RT_SERVICE_URL || !INTERNAL_RPC_TOKEN) {
    return;
  }

  try {
    await axios.post(
      RT_SERVICE_URL,
      payload,
      {
        headers: {
          'x-internal-token': INTERNAL_RPC_TOKEN,
        },
        timeout: 2000,
      }
    );
  } catch (error) {
    console.warn('[waterdb] Failed to publish realtime event:', error.message);
  }
};

