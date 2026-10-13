// Approved Color Foundations homework (owner upload, Oct 2026). Tracked separately from hands-on approvals.
export const HOMEWORK = {
  onboarding: { title: 'Onboarding: education access', intro: 'The educator or designated onboarding lead coordinates with Marylyn as soon as possible to help the co-stylist access the L’ANZA PRO education resources.', items: [
    { key: 'edu_contact', label: 'Contact Marylyn for access instructions.' },
    { key: 'edu_setup', label: 'Help the co-stylist complete the required setup.' },
    { key: 'edu_access', label: 'Confirm they can access the assigned education.' },
    { key: 'edu_assign', label: 'Assign introductory lessons and completion dates.' },
  ] },
  topics: { title: 'Homework', intro: 'Complete the educator-assigned color education while learning in real time through assisting.', items: [
    { key: 'edu_t1', label: 'How hair color works.' },
    { key: 'edu_t2', label: 'Level, tone, and underlying pigment.' },
    { key: 'edu_t3', label: 'Differences between permanent color, demi-permanent color, toner, and lightener.' },
    { key: 'edu_t4', label: 'The role of developer.' },
    { key: 'edu_t5', label: 'Why formulas, placement, and processing vary.' },
    { key: 'edu_t6', label: 'What the stylist observes during processing.' },
  ] },
  reading: { title: 'Home reading', intro: 'Provide an educator-approved “How Hair Color Works” reading guide or selected handbook pages. Keep this introductory: help the co-stylist understand the language and purpose of the work they are observing.', items: [
    { key: 'edu_reading', label: 'Educator-approved reading completed.' },
  ] },
  review: { title: 'Educator review', intro: 'Review homework progress, answer questions, and connect the education to services the co-stylist has assisted with.', items: [
    { key: 'edu_review', label: 'Homework reviewed with educator.' },
  ] },
  askStylist: ['What result are we working toward?', 'Why did you choose this formula?', 'Why are we using this developer?', 'Why are we applying it this way?', 'What are you watching for during processing?'],
};
export const HOMEWORK_GROUPS = [HOMEWORK.onboarding, HOMEWORK.topics, HOMEWORK.reading, HOMEWORK.review];
export const HOMEWORK_KEYS = HOMEWORK_GROUPS.flatMap(g => g.items.map(i => i.key));
