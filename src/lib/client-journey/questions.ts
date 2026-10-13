// Bettina's Client Journey Knowledge Assessment (learner copy — no answers here).
export const CJ_VERSION = 'Client Journey Assessment v1 (Oct 2026)';
export const CJ_LEVELS = ['Associate', 'New Stylist', 'Designer 1', 'Designer 2', 'Advanced 1', 'Advanced 2', 'Master 1', 'Master 2', 'Legacy'] as const;
export const nextLevel = (l: string) => CJ_LEVELS[CJ_LEVELS.indexOf(l as (typeof CJ_LEVELS)[number]) + 1] ?? null;
export type CJQuestion = { n: number; part: number; area: string; question: string; choices: string[] };
export const LETTERS = ['A', 'B', 'C', 'D'] as const;
export const CJ_QUESTIONS: CJQuestion[] = [
 {
  "n": 1,
  "part": 1,
  "area": "Discovery and stylist matching",
  "question": "What is the purpose of the MYA Meet Your Stylist quiz?",
  "choices": [
   "Match a guest with stylists based on their needs, goals, and fit",
   "Approve specialty services",
   "Replace every consultation",
   "Choose the cheapest service"
  ]
 },
 {
  "n": 2,
  "part": 1,
  "area": "Discovery and stylist matching",
  "question": "A new guest is unsure which stylist suits them. What is the best next step?",
  "choices": [
   "Promise a result without learning their needs",
   "Recommend MYA and coordinate with concierge",
   "Book any opening without discussing fit",
   "Tell them all stylists have identical approvals"
  ]
 },
 {
  "n": 3,
  "part": 1,
  "area": "Discovery and stylist matching",
  "question": "Which information helps with an appropriate stylist match?",
  "choices": [
   "Only the appointment price",
   "Only the stylist's social following",
   "Hair goals, hair needs, preferences, and approved services",
   "The guest's clothing brand"
  ]
 },
 {
  "n": 4,
  "part": 2,
  "area": "Pre-visit communication",
  "question": "When are Sanctuary's concierge confirmation calls planned?",
  "choices": [
   "On arrival",
   "One hour before",
   "Only after a missed visit",
   "Four business days before the appointment"
  ]
 },
 {
  "n": 5,
  "part": 2,
  "area": "Pre-visit communication",
  "question": "What comes first in the confirmation-call flow?",
  "choices": [
   "Confirm the existing appointment",
   "Change the appointment without asking",
   "Reserve several treatments automatically",
   "Cancel the appointment"
  ]
 },
 {
  "n": 6,
  "part": 2,
  "area": "Pre-visit communication",
  "question": "How should a suitable treatment be introduced during the call?",
  "choices": [
   "Insist every client needs it",
   "Connect one recommendation to their concern and offer to reserve time",
   "Promise it will fix every problem",
   "Add it without agreement"
  ]
 },
 {
  "n": 7,
  "part": 3,
  "area": "Station preparation and VIP recognition",
  "question": "What should be ready before the guest arrives?",
  "choices": [
   "Only the dryer",
   "A new formula chosen by the co-stylist",
   "The assigned stylist's station, tools, towels, and supplies",
   "Only the checkout receipt"
  ]
 },
 {
  "n": 8,
  "part": 3,
  "area": "Station preparation and VIP recognition",
  "question": "What belongs on the mirror?",
  "choices": [
   "Only the stylist's initials",
   "Payment details",
   "Only the appointment time",
   "Client name, scheduled services underneath, and VIP beside the name when applicable"
  ]
 },
 {
  "n": 9,
  "part": 3,
  "area": "Station preparation and VIP recognition",
  "question": "Why is VIP written beside the client's name?",
  "choices": [
   "To remind the stylist to offer the VIP service treat or another option of the client's choice",
   "To waive all charges",
   "To skip consultation",
   "To require a retail purchase"
  ]
 },
 {
  "n": 10,
  "part": 4,
  "area": "Welcome and role responsibilities",
  "question": "When concierge needs check-in assistance, what should the co-stylist do?",
  "choices": [
   "Wait without greeting",
   "Welcome, support check-in, provide the consultation card, and help the guest settle",
   "Independently change the service plan",
   "Begin checkout"
  ]
 },
 {
  "n": 11,
  "part": 4,
  "area": "Welcome and role responsibilities",
  "question": "What additional item should a VIP client receive?",
  "choices": [
   "A mandatory purchase list",
   "A specialty assessment",
   "The VIP menu",
   "A different cancellation policy"
  ]
 },
 {
  "n": 12,
  "part": 4,
  "area": "Welcome and role responsibilities",
  "question": "Who handles acknowledgment forms and who confirms the consultation service plan?",
  "choices": [
   "Co-stylist handles both",
   "Educator handles both for every guest",
   "Guest decides without consultation",
   "Concierge handles forms; stylist conducts consultation and confirms the plan"
  ]
 },
 {
  "n": 13,
  "part": 5,
  "area": "Consultation and investment clarity",
  "question": "What should the stylist understand during consultation?",
  "choices": [
   "The client's concerns, desired result, and relevant hair history",
   "Only the next available slot",
   "Only which product is most expensive",
   "Only the client's previous bill"
  ]
 },
 {
  "n": 14,
  "part": 5,
  "area": "Consultation and investment clarity",
  "question": "How should services and home care connect to the consultation?",
  "choices": [
   "Recommend the same list to everyone",
   "Connect the client's concern to an appropriate service and product",
   "Avoid discussing the concern",
   "Choose by price alone"
  ]
 },
 {
  "n": 15,
  "part": 5,
  "area": "Consultation and investment clarity",
  "question": "What supports a clear service estimate?",
  "choices": [
   "Assume the online price covers everything",
   "Explain charges after the service only",
   "Use the Consultation Calculator and explain the estimate and SalonScale charges",
   "Let the co-stylist guess the total"
  ]
 },
 {
  "n": 16,
  "part": 6,
  "area": "Comfort and shampoo-room experience",
  "question": "How should the weighted blanket be introduced?",
  "choices": [
   "Apply it without asking",
   "Offer only after a complaint",
   "Tell the client it is compulsory",
   "Offer it and position it according to preference"
  ]
 },
 {
  "n": 17,
  "part": 6,
  "area": "Comfort and shampoo-room experience",
  "question": "Before the eye-mask or hot-towel/lavender-pillow ritual, what should happen?",
  "choices": [
   "Explain the ritual and check comfort with temperature, placement, and fragrance",
   "Assume every guest wants it",
   "Skip all communication",
   "Require the guest to accept it"
  ]
 },
 {
  "n": 18,
  "part": 6,
  "area": "Comfort and shampoo-room experience",
  "question": "A guest reports discomfort. What should the team member do?",
  "choices": [
   "Continue unchanged",
   "Acknowledge it, pause or adjust appropriately, and involve the stylist or educator if needed",
   "Wait until checkout",
   "Explain that discomfort is normal for everyone"
  ]
 },
 {
  "n": 19,
  "part": 7,
  "area": "Return to chair and space reset",
  "question": "Where does the guest return after the shampoo experience?",
  "choices": [
   "Any chair",
   "The waiting area",
   "The original styling chair",
   "The retail counter"
  ]
 },
 {
  "n": 20,
  "part": 7,
  "area": "Return to chair and space reset",
  "question": "What makes the shampoo space ready for the next guest?",
  "choices": [
   "A fresh towel alone",
   "Leaving water to dry later",
   "Cleaning only visible hair",
   "Removing residue and water, completing cleaning/disinfection, and resetting supplies"
  ]
 },
 {
  "n": 21,
  "part": 7,
  "area": "Return to chair and space reset",
  "question": "After helping the client return and resetting the space, what should the co-stylist do?",
  "choices": [
   "Return attention to the client and continue the assigned service support",
   "Leave without a handoff",
   "Start a different service without instructions",
   "Send the client home"
  ]
 },
 {
  "n": 22,
  "part": 8,
  "area": "Product education and client choice",
  "question": "Which choice should the client receive?",
  "choices": [
   "Buy now or skip the finish",
   "Apply and explain, or guide the client through applying products themselves",
   "Choose without explanation",
   "Use every available product"
  ]
 },
 {
  "n": 23,
  "part": 8,
  "area": "Product education and client choice",
  "question": "What should product education explain?",
  "choices": [
   "Brand name only",
   "Price only",
   "Purpose, relevance to the client, amount, placement, and use",
   "How popular the bottle looks"
  ]
 },
 {
  "n": 24,
  "part": 8,
  "area": "Product education and client choice",
  "question": "A client chooses hands-on learning. What should happen?",
  "choices": [
   "Give them bottles and leave",
   "Ignore their preference",
   "Tell them to learn at home alone",
   "Guide the amount and application and check understanding"
  ]
 },
 {
  "n": 25,
  "part": 9,
  "area": "Handoff, checkout, and future visits",
  "question": "How should recommended products reach checkout?",
  "choices": [
   "Bring them to the front with a clear explanation of what was used or recommended",
   "Leave them at the bowl",
   "Put them in the bag without agreement",
   "Ask concierge to guess"
  ]
 },
 {
  "n": 26,
  "part": 9,
  "area": "Handoff, checkout, and future visits",
  "question": "What is VIP Book 3?",
  "choices": [
   "Three products purchased",
   "Holding three future appointments",
   "Three free visits",
   "Three appointments booked without client agreement"
  ]
 },
 {
  "n": 27,
  "part": 9,
  "area": "Handoff, checkout, and future visits",
  "question": "What is the co-stylist's role in booking and referral communication?",
  "choices": [
   "Change appointments independently",
   "Invent referral terms",
   "Support the stylist/concierge handoff when requested",
   "Promise unconfirmed discounts"
  ]
 },
 {
  "n": 28,
  "part": 10,
  "area": "Follow-up, questions, and concerns",
  "question": "A client asks something you cannot confidently answer. What should you do?",
  "choices": [
   "Guess confidently",
   "Ignore it",
   "Ask another client",
   "Get the appropriate stylist, concierge, or educator"
  ]
 },
 {
  "n": 29,
  "part": 10,
  "area": "Follow-up, questions, and concerns",
  "question": "How should you respond to an unhappy client?",
  "choices": [
   "Listen, acknowledge the concern, and involve the appropriate team member",
   "Argue before hearing details",
   "Discuss it with other guests",
   "Promise an outcome beyond your authority"
  ]
 },
 {
  "n": 30,
  "part": 10,
  "area": "Follow-up, questions, and concerns",
  "question": "What is the purpose of post-visit follow-up and review requests?",
  "choices": [
   "Pressure the client to praise the salon",
   "Support the relationship, check the experience, and invite feedback through the salon process",
   "Guarantee a positive review",
   "Replace resolving a concern"
  ]
 }
];
