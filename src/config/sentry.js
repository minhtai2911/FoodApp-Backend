import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: "https://683812db1fee9f4a744e8192186c07a3@o4509320183742464.ingest.us.sentry.io/4509320211464192",

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});