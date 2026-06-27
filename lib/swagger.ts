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
    components: {
      securitySchemes: {
        nextAuth: {
          type: "apiKey",
          in: "cookie",
          name: "next-auth.session-token",
        },
      },
    },
  },
  apis: ["./app/api/**/*.ts"],
};

export const spec = swaggerJsdoc(options);
