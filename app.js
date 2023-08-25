// Import the Fastify module
const fastify = require("fastify")();
const router = require("./router");
const swagger = require("./res/service/swagger");

// Define a router
router.init(fastify);
Promise.all([swagger.loadData(fastify)]).then(() => {
  // Start the server
  fastify.listen({ port: 3000, address: "0.0.0.0" }, function (err, address) {
    swagger.updateData(fastify);
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    console.log(`Server is running on ${address}`);
    // Server is now listening on ${address}
  });
});
