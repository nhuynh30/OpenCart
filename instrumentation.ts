export function register() {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      "\n  Swagger UI available at http://localhost:3000/api/docs/ui\n"
    );
  }
}
