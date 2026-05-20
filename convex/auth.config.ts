const issuer =
  process.env.SESSION_ISSUER?.trim() || "https://employee-evals.vercel.app";

export default {
  providers: [
    {
      domain: issuer,
      applicationID: "employee-evals",
    },
  ],
};
