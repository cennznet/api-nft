import Fastify from "fastify";
import { routes } from "./routes/index";
import { config } from "dotenv";
import mongoConnector from "./mongo";
config();

const fastify = Fastify({
	logger: true,
});

fastify.register(mongoConnector);
fastify.register(routes);

fastify.listen(process.env.PORT || 3000, '0.0.0.0', function (err, address) {
	if (err) {
		fastify.log.error(err);
		process.exit(1);
	}
	// Server is now listening on ${address}
});
