const axios = require("axios");

module.exports = {
  get: async (url) => {
    try {
      const response = await axios.get(url);
      const data = response.data;
      return data;
    } catch (error) {
      console.error(new Date());
      console.error(error);
      return error;
    }
  },
  post: async (url, requestBody) => {
    try {
      const response = await axios.post(url, requestBody);
      const responseData = response.data;
      return responseData;
    } catch (error) {
      console.error(new Date());
      console.error(error);
      return error;
    }
  },
  proxy: async (config) => {
    let result;
    await axios(config).then(
      (res) => {
        result = res.data;
      },
      (err) => {
        console.error(new Date());
        console.error(err.response.data);
        throw err.response.data;
        //result = err.response.data;
      }
    );
    return result;
  },
};
