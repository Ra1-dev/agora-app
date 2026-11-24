// Fictional participants. Names and organizations are invented for the demo.

export const INTERESTS = [
  "Edge AI", "Accessibility", "Privacy", "Robotics", "Language models", "Security", "Threat modeling",
  "Data engineering", "Design systems", "Typography", "Federated learning", "Computer vision", "HCI",
  "Wearables", "Data visualization", "Field robotics", "Forecasting", "Inclusive design", "Voice interfaces",
  "Healthcare", "Open data", "Motion design", "Simulation", "Model compression",
] as const;

export type Interest = (typeof INTERESTS)[number];

export type PersonSeed = {
  id: string;
  name: string;
  title: string;
  organization: string;
  bio: string;
  skills: string[];
  interests: Interest[];
  networking: boolean;
  show?: Partial<{ organization: boolean; title: boolean; interests: boolean; bio: boolean; skills: boolean }>;
};

export const ORGANIZER = {
  id: "u_organizer",
  name: "Saltanat Ermekova",
  title: "Program lead",
  organization: "Steppe Digital Foundation",
};

export const PEOPLE: PersonSeed[] = [
  {
    id: "u_dana", name: "Dana Seitkali", title: "PhD student", organization: "Esil Polytechnic",
    bio: "I work on running small vision models on wheelchairs and canes, so navigation aids work offline.",
    skills: ["PyTorch", "Embedded C", "User studies"],
    interests: ["Edge AI", "Accessibility", "Privacy"], networking: true,
    show: { organization: true, title: true, interests: true, bio: false, skills: false },
  },
  {
    id: "u_aruzhan", name: "Aruzhan Kassymova", title: "ML engineer", organization: "Steppe Labs",
    bio: "Sensors, small models and too many batteries.",
    skills: ["TensorFlow Lite", "Rust"],
    interests: ["Edge AI", "Robotics", "Model compression"], networking: true,
  },
  {
    id: "u_ruslan", name: "Ruslan Bekmukhanov", title: "Product manager", organization: "Karavan Logistics",
    bio: "Here to see what our warehouse team should try next.",
    skills: [], interests: [], networking: false,
  },
  {
    id: "u_timur", name: "Timur Sadykov", title: "Security researcher", organization: "Altai Secure",
    bio: "Breaking things so they get fixed.", skills: ["Fuzzing", "Go"],
    interests: ["Security", "Threat modeling", "Privacy"], networking: true,
  },
  {
    id: "u_madina", name: "Madina Omarova", title: "UX lead", organization: "Altyn UX Studio",
    bio: "Designing services people finish on the first try.", skills: ["Research", "Figma"],
    interests: ["Accessibility", "Design systems", "Inclusive design"], networking: true,
  },
  { id: "u_askar", name: "Askar Zhumabayev", title: "Data engineer", organization: "Steppe Grid Analytics", bio: "", skills: ["SQL", "Airflow"], interests: ["Data engineering", "Open data", "Forecasting"], networking: true },
  { id: "u_kamila", name: "Kamila Nurpeisova", title: "Accessibility specialist", organization: "City Services Lab", bio: "Testing public websites with real screen reader users.", skills: ["NVDA", "WCAG"], interests: ["Accessibility", "Inclusive design", "HCI"], networking: true },
  { id: "u_ilyas", name: "Ilyas Kenzhebek", title: "Robotics engineer", organization: "Ural Field Robotics Lab", bio: "", skills: ["ROS", "C++"], interests: ["Field robotics", "Robotics", "Simulation"], networking: true },
  { id: "u_sara", name: "Sara Lindqvist", title: "Privacy engineer", organization: "Fjordline Health", bio: "Privacy reviews for hospital software.", skills: ["Threat modeling"], interests: ["Privacy", "Healthcare", "Federated learning"], networking: true },
  { id: "u_dias", name: "Dias Akhmetov", title: "Mobile developer", organization: "Kolik Apps", bio: "", skills: ["Kotlin", "Swift"], interests: ["Edge AI", "Computer vision"], networking: true },
  { id: "u_aidana", name: "Aidana Serikbay", title: "Product designer", organization: "Tengri Maps", bio: "Maps for people in a hurry.", skills: ["Figma", "Mapbox"], interests: ["Data visualization", "Design systems", "Accessibility"], networking: true, show: { organization: false } },
  { id: "u_nikolai", name: "Nikolai Petrenko", title: "Research scientist", organization: "Qazaq Language Group", bio: "", skills: ["JAX"], interests: ["Language models", "Voice interfaces"], networking: true },
  { id: "u_zhanna", name: "Zhanna Ospanova", title: "CISO", organization: "Saryarka Bank Group", bio: "", skills: [], interests: ["Security", "Privacy"], networking: false },
  { id: "u_marat", name: "Marat Iskakov", title: "Student", organization: "Esil Polytechnic", bio: "Second year, looking for a summer internship in robotics.", skills: ["Python"], interests: ["Robotics", "Computer vision", "Edge AI"], networking: true },
  { id: "u_leyla", name: "Leyla Hasanova", title: "UX researcher", organization: "Lumen Interaction Lab", bio: "", skills: ["Interviews"], interests: ["HCI", "Wearables", "Voice interfaces"], networking: true },
  { id: "u_yuki", name: "Yuki Tanabe", title: "Type designer", organization: "Atelier Nove", bio: "", skills: ["Glyphs"], interests: ["Typography", "Motion design", "Design systems"], networking: true },
  { id: "u_bekzat", name: "Bekzat Ermekov", title: "Backend engineer", organization: "Kolik Apps", bio: "", skills: ["Go", "PostgreSQL"], interests: ["Data engineering", "Security"], networking: true, show: { interests: false } },
  { id: "u_ainur", name: "Ainur Tleubayeva", title: "Data scientist", organization: "Medeu Health Data", bio: "Models for small clinics.", skills: ["R", "Python"], interests: ["Healthcare", "Federated learning", "Privacy"], networking: true },
  { id: "u_oliver", name: "Oliver Brandt", title: "Hardware engineer", organization: "Kestrel Compute", bio: "", skills: ["FPGA"], interests: ["Edge AI", "Model compression"], networking: false },
  { id: "u_gaukhar", name: "Gaukhar Mukhanova", title: "Lecturer", organization: "Esil Polytechnic", bio: "Teaching HCI and accessibility.", skills: [], interests: ["HCI", "Accessibility", "Wearables"], networking: true },
  { id: "u_samat", name: "Samat Baimukhanov", title: "Drone pilot", organization: "Dala Agro", bio: "", skills: [], interests: ["Field robotics", "Computer vision"], networking: true },
  { id: "u_elena", name: "Elena Sokolova", title: "Design systems lead", organization: "City Services Lab", bio: "", skills: ["Tokens", "React"], interests: ["Design systems", "Accessibility", "Typography"], networking: true },
  { id: "u_arsen", name: "Arsen Mukashev", title: "Security analyst", organization: "Altai Secure", bio: "", skills: ["SIEM"], interests: ["Security", "Threat modeling"], networking: true, show: { interests: false } },
  { id: "u_meruyert", name: "Meruyert Daulet", title: "Journalist", organization: "Orda Review", bio: "Writing about technology in Central Asia.", skills: [], interests: ["Language models", "Privacy", "Open data"], networking: true },
  { id: "u_hamid", name: "Hamid Rahimi", title: "Robotics student", organization: "Esil Polytechnic", bio: "", skills: ["ROS"], interests: ["Robotics", "Simulation"], networking: true },
  { id: "u_assel", name: "Assel Karimova", title: "Analytics lead", organization: "Korgan Analytics", bio: "", skills: ["dbt"], interests: ["Forecasting", "Data visualization", "Open data"], networking: false },
  { id: "u_chen", name: "Chen Wei", title: "ML engineer", organization: "Hokuto Robotics", bio: "", skills: ["PyTorch"], interests: ["Robotics", "Simulation", "Model compression"], networking: true },
  { id: "u_togzhan", name: "Togzhan Abenova", title: "Startup founder", organization: "Qamqor Health", bio: "Building a triage assistant for rural clinics.", skills: [], interests: ["Healthcare", "Language models", "Privacy"], networking: true },
  { id: "u_viktor", name: "Viktor Lim", title: "Engineering manager", organization: "Karavan Logistics", bio: "", skills: [], interests: [], networking: false },
  { id: "u_alina", name: "Alina Zhaksylyk", title: "Frontend developer", organization: "Kolik Apps", bio: "", skills: ["TypeScript"], interests: ["Accessibility", "Motion design"], networking: true, show: { bio: true } },
];

/** Accepted connections among participants, beyond Dana's own (for networking stats and People). */
export const OTHER_CONNECTIONS: [string, string][] = [
  ["u_aruzhan", "u_dias"], ["u_aruzhan", "u_marat"], ["u_kamila", "u_madina"], ["u_kamila", "u_gaukhar"],
  ["u_ilyas", "u_samat"], ["u_ilyas", "u_hamid"], ["u_sara", "u_ainur"], ["u_sara", "u_timur"],
  ["u_nikolai", "u_meruyert"], ["u_yuki", "u_elena"], ["u_togzhan", "u_ainur"], ["u_chen", "u_hamid"],
  ["u_leyla", "u_gaukhar"], ["u_madina", "u_elena"], ["u_alina", "u_elena"],
];

// Pools for the lightweight attendees (registrations and saves only; not listed in People).
export const FIRST_NAMES = [
  "Aibek", "Aigul", "Akmaral", "Alibek", "Almas", "Amina", "Anel", "Aruzhan", "Asylbek", "Ayana", "Azamat",
  "Bauyrzhan", "Botagoz", "Daniyar", "Dariga", "Dilnaz", "Erlan", "Gulmira", "Inkar", "Kairat", "Karina",
  "Laura", "Madi", "Malika", "Miras", "Nazerke", "Nurlan", "Olzhas", "Saule", "Sanzhar", "Tomiris", "Yerkebulan",
  "Zhanel", "Zhansaya", "Adil", "Alisher", "Anna", "David", "Elena", "Ivan", "Maria", "Pavel", "Sofia", "Omar",
];

export const LAST_NAMES = [
  "Abdrakhmanov", "Akhmetova", "Alimbekov", "Amanova", "Baimukhamedov", "Bekova", "Dauletov", "Dzhumabaeva",
  "Ermekov", "Galiyeva", "Ibraimov", "Kairatova", "Kassenov", "Kenzhebayeva", "Mukanov", "Nurmagambetova",
  "Omarov", "Ospanova", "Rakhimov", "Sarsenova", "Seitkaliyev", "Shaikenova", "Suleimenov", "Tasbolatova",
  "Utepova", "Yessenov", "Zhakupova", "Zhunusov", "Ivanova", "Kim", "Lee", "Novak", "Petrova",
];

export const BULK_ATTENDEES = 410;
