// PostgreSQL timestamp-without-time-zone fields retain the legacy UTC convention.
// Explicit UTC keeps API dates and outbox leases independent of the host timezone.
export const nowUtc = () => Temporal.Now.plainDateTimeISO("UTC");

export const toUtcISOString = (value: Temporal.PlainDateTime) =>
  `${value.toString({ smallestUnit: "millisecond" })}Z`;
