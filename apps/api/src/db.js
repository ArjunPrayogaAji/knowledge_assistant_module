const path = require("path");
const knex = require("knex");

const knexConfig = require(path.resolve(
  __dirname,
  "../../../packages/db/knexfile.cjs"
));

const environment = process.env.NODE_ENV || "development";
const baseConfig = knexConfig[environment];

const db = knex({
  ...baseConfig,
  connection: process.env.DATABASE_URL || baseConfig.connection
});

module.exports = db;
