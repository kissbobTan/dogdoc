const fastifyStatic = require("@fastify/static");
const path = require("path");
const api = require("./res/service/api");
const common = require("./res/service/common");

module.exports = {
  init: function (f) {
    f.register(fastifyStatic, {
      root: path.join(__dirname, "res/cilent/dist/"),
      prefix: "/", // 可选的 URL 前缀，默认为 '/'
    });

    f.get("/service/getMenu", async (request, reply) => {
      return api.getmenu();
    });

    f.get("/service/getApiInfo", async (request, reply) => {
      let query = request.query;
      return api.getApiInfo(query.apiUrl, query.path);
    });

    f.all("/service/proxy", async (request, reply) => {
      let config = request.body.data;
      return await common.proxy(config);
      // 其他处理逻辑...
    });

    f.get("/service/getError", async () => {
      return api.getError();
    });
  },
};
