import fastifyPlugin from "fastify-plugin";
import fastifyMongo from "@fastify/mongodb";

export default async function mongoConnector(fastify, _options) {
	const connectionStr = process.env.MONGO_URI;
	fastify.log.info(`connecting to mongodb ${connectionStr}`);
	fastify.register(fastifyMongo, {
		forceClose: true,
		url: connectionStr,
	});
}

// Wrapping a plugin function with fastify-plugin exposes the decorators
// and hooks, declared inside the plugin to the parent scope.
module.exports = fastifyPlugin(mongoConnector);
