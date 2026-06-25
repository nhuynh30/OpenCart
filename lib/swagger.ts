import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "OpenCart API",
      version: "1.0.0",
      description: "API documentation for OpenCart marketplace",
    },
    servers: [
      {
        url: process.env.NEXTAUTH_URL || "http://localhost:3000",
      },
    ],
  },
  apis: ["./app/api/**/*.ts"],
};

export const spec = swaggerJsdoc(options);
