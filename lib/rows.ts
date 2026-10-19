import type { ContactData, JoinData } from './validate';

// Database rows for the two forms. Used by the API routes and, on the static backup site, by the forms themselves.
export const contactRow = (d: ContactData) => ({ name: d.name, email: d.email, topic: d.topic, message: d.message });

export const joinRow = (d: JoinData) => ({
  name: d.name, email: d.email, phone: d.phone || null, major: d.major, year: d.year,
  ieee_member: d.ieeeMember, interests: d.interests, message: d.message || null,
});
