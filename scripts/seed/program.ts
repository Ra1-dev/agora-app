// STEPPE AI Summit 2027 — fictional program. All people and organizations are invented.

export const EVENT = {
  id: "ev_steppe27",
  slug: "steppe-ai-2027",
  name: "STEPPE AI Summit 2027",
  code: "STEPPE27",
  startsOn: "2027-05-14",
  endsOn: "2027-05-16",
  timeZone: "Asia/Almaty",
  city: "Astana",
  venueName: "Esil Congress Center",
  organizerName: "Steppe Digital Foundation",
  brandColor: "#5B3DF5",
  about:
    "Three days on applied AI, security, interfaces, robotics, data and design, with people who build these systems in Central Asia and beyond. Organized by the Steppe Digital Foundation.",
  logoUrl: "/events/steppe-ai-2027/organizer-logo-ink.svg",
  logoDarkUrl: "/events/steppe-ai-2027/organizer-logo-white.svg",
  markUrl: "/events/steppe-ai-2027/organizer-mark.svg",
  coverMeta: "May 14–16, Astana",
} as const;

export const TRACKS = [
  { id: "tr_ai", name: "AI", description: "Models, evaluation and running them where people are." },
  { id: "tr_security", name: "Security", description: "Threats, privacy and keeping systems trustworthy." },
  { id: "tr_hci", name: "HCI", description: "Interfaces, accessibility and how people use technology." },
  { id: "tr_robotics", name: "Robotics", description: "Robots in fields, warehouses and labs." },
  { id: "tr_data", name: "Data", description: "Pipelines, analytics and data that stays useful." },
  { id: "tr_design", name: "Design", description: "Design systems, type, motion and clear information." },
] as const;

export type TrackId = (typeof TRACKS)[number]["id"];

export const VENUES = [
  { id: "ve_hall_a", name: "Hall A", floor: "Level 1", capacity: 600 },
  { id: "ve_hall_b", name: "Hall B", floor: "Level 1", capacity: 400 },
  { id: "ve_hall_c", name: "Hall C", floor: "Level 2", capacity: 300 },
  { id: "ve_room_3", name: "Room 3", floor: "Level 2", capacity: 120 },
  { id: "ve_room_4", name: "Room 4", floor: "Level 2", capacity: 80 },
] as const;

export type VenueId = (typeof VENUES)[number]["id"];

export const SPEAKERS = [
  { id: "sp_aigerim", name: "Aigerim Nurlanova", organization: "Kestrel Compute", title: "Principal engineer", tags: ["Edge AI", "TinyML", "Model compression"], bio: "Aigerim ships neural networks to devices with less memory than a photo. She leads on-device inference at Kestrel Compute." },
  { id: "sp_daniyar", name: "Daniyar Abenov", organization: "Saryarka Data Trust", title: "Head of privacy", tags: ["Privacy", "Data governance", "Compliance"], bio: "Daniyar helps public and private teams collect less data and explain what they keep." },
  { id: "sp_zarina", name: "Zarina Tulegenova", organization: "Altyn UX Studio", title: "Accessibility lead", tags: ["Accessibility", "Inclusive design", "Forms"], bio: "Zarina runs accessibility audits and teaches teams to test with screen readers every week." },
  { id: "sp_yerlan", name: "Yerlan Bekov", organization: "Ural Field Robotics Lab", title: "Research lead", tags: ["Field robotics", "Drones", "Navigation"], bio: "Yerlan builds robots that work outdoors in dust, wind and long winters." },
  { id: "sp_lena", name: "Lena Hartmann", organization: "Nordlicht Institute", title: "Senior researcher", tags: ["Wearables", "HCI", "Attention"], bio: "Lena studies how wearables interrupt people, and how to make them stop." },
  { id: "sp_arman", name: "Arman Seitov", organization: "Qazaq Language Group", title: "Research director", tags: ["Language models", "Kazakh NLP", "Evaluation"], bio: "Arman trains and evaluates language models for Kazakh, Russian and English." },
  { id: "sp_priya", name: "Priya Raman", organization: "Tidewater Security Lab", title: "Security researcher", tags: ["Security", "Threat modeling", "Red teaming"], bio: "Priya breaks machine learning systems on purpose so others do not break them by accident." },
  { id: "sp_bolat", name: "Bolat Zhunusov", organization: "Steppe Grid Analytics", title: "Data engineering lead", tags: ["Data engineering", "Energy", "Pipelines"], bio: "Bolat keeps energy data flowing on a small budget." },
  { id: "sp_sofia", name: "Sofia Marchetti", organization: "Atelier Nove", title: "Design director", tags: ["Design systems", "Typography", "Motion"], bio: "Sofia designs type and systems for public services and dense information." },
  { id: "sp_kenji", name: "Kenji Arai", organization: "Hokuto Robotics", title: "Robot learning engineer", tags: ["Robot learning", "Simulation", "Manipulation"], bio: "Kenji teaches robots to pick things up, first in simulation and then for real." },
  { id: "sp_gulnara", name: "Gulnara Akhmetova", organization: "Medeu Health Data", title: "Machine learning lead", tags: ["Federated learning", "Privacy", "Healthcare"], bio: "Gulnara trains models across clinics without moving patient records." },
  { id: "sp_marcus", name: "Marcus Webb", organization: "Quarry Security", title: "Incident response lead", tags: ["Security", "Incident response", "Supply chain"], bio: "Marcus has been on call for more model incidents than he would like." },
  { id: "sp_aliya", name: "Aliya Dzhaksybekova", organization: "Tengri Maps", title: "Product designer", tags: ["Accessibility", "Mapping", "Data visualization"], bio: "Aliya designs maps and charts that people can read in a hurry." },
  { id: "sp_nurlan", name: "Nurlan Omarov", organization: "Korgan Analytics", title: "Chief data scientist", tags: ["Forecasting", "Open data", "Cities"], bio: "Nurlan forecasts how cities move, eat and use energy." },
  { id: "sp_elif", name: "Elif Kaya", organization: "Lumen Interaction Lab", title: "Interaction researcher", tags: ["Voice interfaces", "HCI", "Accessibility"], bio: "Elif designs voice and audio interfaces for loud, busy places." },
] as const;

export type SpeakerId = (typeof SPEAKERS)[number]["id"];
export type DayId = "fri" | "sat" | "sun";
export const DAY_DATES: Record<DayId, string> = { fri: "2027-05-14", sat: "2027-05-15", sun: "2027-05-16" };

export type SessionSeed = {
  id: string;
  day: DayId;
  start: string;
  end: string;
  venue: VenueId;
  track: TrackId;
  format: "keynote" | "talk" | "panel" | "workshop";
  title: string;
  abstract: string;
  speakers: SpeakerId[];
  /** Relative pull on the seeded crowd (saves, views, check-ins). */
  appeal: number;
};

export const SESSIONS: SessionSeed[] = [
  // ---------------- Friday, May 14 ----------------
  { id: "se_opening", day: "fri", start: "09:30", end: "10:30", venue: "ve_hall_a", track: "tr_ai", format: "keynote", appeal: 3.2, speakers: ["sp_arman"],
    title: "Opening keynote: models that fit the steppe",
    abstract: "What it takes to build language and vision models for a region with three languages, long distances and patchy connectivity, and what we learned shipping them." },
  { id: "se_edge_micro", day: "fri", start: "10:45", end: "11:30", venue: "ve_hall_a", track: "tr_ai", format: "talk", appeal: 1.8, speakers: ["sp_aigerim"],
    title: "Edge AI on microcontrollers",
    abstract: "Running edge AI with kilobytes of memory: quantization, pruning and the battery budget on real sensors in the field." },
  { id: "se_threat_ml", day: "fri", start: "10:45", end: "11:30", venue: "ve_hall_b", track: "tr_security", format: "talk", appeal: 1.3, speakers: ["sp_priya"],
    title: "Threat modeling for ML pipelines",
    abstract: "A practical threat model for training data, model weights and serving, with the attacks that actually happen." },
  { id: "se_crowded_rooms", day: "fri", start: "10:45", end: "11:30", venue: "ve_room_3", track: "tr_hci", format: "talk", appeal: 1.1, speakers: ["sp_elif"],
    title: "Designing for crowded rooms",
    abstract: "Interfaces for conference halls, stations and markets: noise, glare, one free hand and accessibility for everyone in the room." },
  { id: "se_sensor_fusion", day: "fri", start: "10:45", end: "11:30", venue: "ve_room_4", track: "tr_robotics", format: "talk", appeal: 0.9, speakers: ["sp_kenji"],
    title: "Sensor fusion on a budget",
    abstract: "Combining cheap cameras, IMUs and wheel encoders into a pose estimate you can trust." },
  { id: "se_forecast_city", day: "fri", start: "11:45", end: "12:30", venue: "ve_hall_a", track: "tr_data", format: "talk", appeal: 1.2, speakers: ["sp_nurlan"],
    title: "Forecasting demand for a city of two million",
    abstract: "Forecasting heating, transport and water demand from open data, and how to explain the error bars to a city council." },
  { id: "se_public_design", day: "fri", start: "11:45", end: "12:30", venue: "ve_hall_b", track: "tr_design", format: "talk", appeal: 1.0, speakers: ["sp_sofia"],
    title: "Design systems for public services",
    abstract: "One design system for forty government services: components, tokens and the governance that keeps it alive." },
  { id: "se_kazakh_llm", day: "fri", start: "11:45", end: "12:30", venue: "ve_hall_c", track: "tr_ai", format: "talk", appeal: 1.6, speakers: ["sp_arman"],
    title: "Kazakh and Russian in one language model",
    abstract: "Tokenizers, code-switching and evaluation sets for a bilingual language model, and where it still fails." },
  { id: "se_model_incident", day: "fri", start: "14:00", end: "14:45", venue: "ve_hall_a", track: "tr_security", format: "talk", appeal: 1.2, speakers: ["sp_marcus"],
    title: "Incident response when the model is the incident",
    abstract: "Runbooks for prompt injection, data leaks through outputs and rolled-back model versions." },
  { id: "se_wearables_attention", day: "fri", start: "14:00", end: "14:45", venue: "ve_hall_b", track: "tr_hci", format: "talk", appeal: 1.0, speakers: ["sp_lena"],
    title: "Wearables that respect attention",
    abstract: "Field studies of notifications on watches and rings, and design rules for interrupting people less." },
  { id: "se_type_workshop", day: "fri", start: "14:00", end: "15:30", venue: "ve_room_3", track: "tr_design", format: "workshop", appeal: 0.8, speakers: ["sp_sofia"],
    title: "Workshop: type for dense schedules",
    abstract: "Hands-on typography for timetables and programs: tabular numerals, small caps and line length. Bring a laptop." },
  { id: "se_energy_pipelines", day: "fri", start: "15:00", end: "15:45", venue: "ve_hall_a", track: "tr_data", format: "talk", appeal: 0.9, speakers: ["sp_bolat"],
    title: "Cheap pipelines for energy data",
    abstract: "Ingesting meter data from thousands of sites with a small team and a smaller budget." },
  { id: "se_sim_first", day: "fri", start: "15:00", end: "15:45", venue: "ve_hall_c", track: "tr_robotics", format: "talk", appeal: 1.0, speakers: ["sp_kenji"],
    title: "Simulation before the first field test",
    abstract: "How much simulation is enough before a robot meets mud, and how to close the gap afterwards." },
  { id: "se_open_models_panel", day: "fri", start: "16:00", end: "16:45", venue: "ve_hall_a", track: "tr_ai", format: "panel", appeal: 2.2, speakers: ["sp_daniyar", "sp_priya", "sp_arman"],
    title: "Panel: open models in regulated industries",
    abstract: "Banks, clinics and governments want open models. A privacy lead, a security researcher and a model builder on what that takes." },

  // ---------------- Saturday, May 15 ----------------
  { id: "se_keynote_everyone", day: "sat", start: "09:30", end: "10:30", venue: "ve_hall_a", track: "tr_hci", format: "keynote", appeal: 2.8, speakers: ["sp_elif"],
    title: "Keynote: interfaces for everyone in the room",
    abstract: "Accessibility as the default: voice, captions, contrast and the people we forget when we design for the average user." },
  { id: "se_redteam_llm", day: "sat", start: "10:45", end: "11:30", venue: "ve_hall_a", track: "tr_security", format: "talk", appeal: 1.5, speakers: ["sp_priya"],
    title: "Red-teaming language models",
    abstract: "A repeatable red-teaming process for language models, from prompt injection to data extraction." },
  { id: "se_data_contracts", day: "sat", start: "10:45", end: "11:30", venue: "ve_hall_b", track: "tr_data", format: "talk", appeal: 1.0, speakers: ["sp_bolat"],
    title: "Data contracts between teams",
    abstract: "Schemas, owners and alerts: agreeing on data before it breaks a dashboard." },
  { id: "se_wayfinding", day: "sat", start: "10:45", end: "11:30", venue: "ve_hall_c", track: "tr_hci", format: "talk", appeal: 1.2, speakers: ["sp_aliya"],
    title: "Accessible wayfinding for crowded venues",
    abstract: "Indoor maps, audio directions and accessibility for people who cannot read the signs from far away." },
  { id: "se_grippers", day: "sat", start: "10:45", end: "11:30", venue: "ve_room_4", track: "tr_robotics", format: "talk", appeal: 0.8, speakers: ["sp_kenji"],
    title: "Grasping with cheap grippers",
    abstract: "Robot learning for grasping with soft, low-cost grippers and very little training data." },
  { id: "se_small_models", day: "sat", start: "11:30", end: "12:15", venue: "ve_hall_b", track: "tr_ai", format: "talk", appeal: 2.0, speakers: ["sp_aigerim"],
    title: "Small models on the edge",
    abstract: "Distilling language and vision models to run on phones and sensors: edge AI without a data center, measured in milliwatts." },
  { id: "se_privacy_design", day: "sat", start: "11:45", end: "12:30", venue: "ve_hall_a", track: "tr_security", format: "talk", appeal: 1.9, speakers: ["sp_daniyar"],
    title: "Privacy by design",
    abstract: "Data minimisation, consent and privacy reviews that ship with the product instead of after the launch." },
  { id: "se_charts_five", day: "sat", start: "11:45", end: "12:30", venue: "ve_room_3", track: "tr_design", format: "talk", appeal: 0.9, speakers: ["sp_aliya"],
    title: "Charts people can read in five seconds",
    abstract: "Data visualization for dashboards and signs: one message per chart, direct labels and color that survives projectors." },
  { id: "se_drones_grain", day: "sat", start: "11:45", end: "12:30", venue: "ve_room_4", track: "tr_robotics", format: "talk", appeal: 1.0, speakers: ["sp_yerlan"],
    title: "Drones over the grain belt",
    abstract: "Field robotics at farm scale: navigation, wind and keeping drones flying through harvest." },
  { id: "se_eval_users", day: "sat", start: "14:00", end: "14:45", venue: "ve_hall_a", track: "tr_ai", format: "talk", appeal: 1.4, speakers: ["sp_arman"],
    title: "Evaluating language models with real users",
    abstract: "Benchmarks are not users. Running evaluation studies with people, and what changed in our models afterwards." },
  { id: "se_voice_noisy", day: "sat", start: "14:00", end: "14:45", venue: "ve_hall_b", track: "tr_hci", format: "talk", appeal: 1.1, speakers: ["sp_elif"],
    title: "Voice interfaces in noisy places",
    abstract: "Speech recognition and audio feedback for markets, stations and factory floors." },
  { id: "se_federated_clinics", day: "sat", start: "15:00", end: "15:45", venue: "ve_room_3", track: "tr_data", format: "talk", appeal: 1.3, speakers: ["sp_gulnara"],
    title: "Federated learning in clinics",
    abstract: "Training models across hospitals without moving patient records: federated learning, privacy budgets and the paperwork." },
  { id: "se_weights_supply", day: "sat", start: "15:00", end: "15:45", venue: "ve_hall_a", track: "tr_security", format: "talk", appeal: 1.1, speakers: ["sp_marcus"],
    title: "Supply chain attacks on model weights",
    abstract: "Poisoned checkpoints, tampered model hubs and how to verify what you download." },
  { id: "se_inclusive_forms", day: "sat", start: "16:00", end: "16:45", venue: "ve_hall_b", track: "tr_design", format: "talk", appeal: 1.0, speakers: ["sp_zarina"],
    title: "Inclusive forms that people finish",
    abstract: "Labels, errors and accessibility in forms: small changes that let more people get to the end." },
  { id: "se_private_edge", day: "sat", start: "16:00", end: "16:45", venue: "ve_hall_c", track: "tr_ai", format: "talk", appeal: 1.2, speakers: ["sp_gulnara"],
    title: "Privacy-preserving analytics at the edge",
    abstract: "Keeping raw data on the device: edge AI, on-device aggregation and privacy guarantees you can explain." },

  // ---------------- Sunday, May 16 ----------------
  { id: "se_vision_drones", day: "sun", start: "09:30", end: "10:15", venue: "ve_hall_a", track: "tr_ai", format: "talk", appeal: 1.5, speakers: ["sp_aigerim", "sp_yerlan"],
    title: "Compressing vision models for drones",
    abstract: "Model compression and edge AI for drone cameras: what survives pruning, and what the battery thinks about it." },
  { id: "se_robots_wild", day: "sun", start: "10:00", end: "10:45", venue: "ve_room_4", track: "tr_robotics", format: "talk", appeal: 1.0, speakers: ["sp_yerlan"],
    title: "Robots in the wild",
    abstract: "Field robotics stories from three winters of robots working outside the lab." },
  { id: "se_screen_readers", day: "sun", start: "10:30", end: "11:15", venue: "ve_hall_b", track: "tr_hci", format: "talk", appeal: 1.0, speakers: ["sp_zarina"],
    title: "Screen readers and live data",
    abstract: "Accessibility for dashboards and live updates: announcing changes without overwhelming screen reader users." },
  { id: "se_passkeys", day: "sun", start: "10:30", end: "11:15", venue: "ve_hall_c", track: "tr_security", format: "talk", appeal: 1.0, speakers: ["sp_marcus"],
    title: "Passkeys for event apps",
    abstract: "Replacing passwords for thousands of one-weekend users without locking anyone out." },
  { id: "se_open_data_city", day: "sun", start: "10:30", end: "11:15", venue: "ve_room_3", track: "tr_data", format: "talk", appeal: 0.9, speakers: ["sp_nurlan"],
    title: "Open data for the city",
    abstract: "Publishing open data that people actually use: formats, update schedules and feedback loops." },
  { id: "se_diff_privacy", day: "sun", start: "11:30", end: "12:15", venue: "ve_hall_a", track: "tr_data", format: "talk", appeal: 1.2, speakers: ["sp_daniyar"],
    title: "Differential privacy for public statistics",
    abstract: "Adding noise to published statistics to protect privacy, and explaining it to the people who use the numbers." },
  { id: "se_motion_helps", day: "sun", start: "11:30", end: "12:15", venue: "ve_hall_b", track: "tr_design", format: "talk", appeal: 0.9, speakers: ["sp_sofia"],
    title: "Motion that helps, not distracts",
    abstract: "Motion design rules for product interfaces: what to animate, how long and when to stop." },
  { id: "se_demonstrations", day: "sun", start: "11:30", end: "12:15", venue: "ve_room_4", track: "tr_robotics", format: "talk", appeal: 1.0, speakers: ["sp_kenji"],
    title: "Teaching robots with demonstrations",
    abstract: "Robot learning from a few human demonstrations, and the data you need to collect on day one." },
  { id: "se_wearables_field", day: "sun", start: "14:00", end: "14:45", venue: "ve_hall_c", track: "tr_hci", format: "talk", appeal: 0.9, speakers: ["sp_lena"],
    title: "Wearables for field workers",
    abstract: "Wearables for people with gloves on: haptics, glanceable screens and battery life in the cold." },
  { id: "se_kazakh_speech", day: "sun", start: "14:00", end: "14:45", venue: "ve_hall_b", track: "tr_ai", format: "talk", appeal: 1.3, speakers: ["sp_arman", "sp_elif"],
    title: "On-device speech for Kazakh",
    abstract: "Speech recognition that runs offline on a phone: edge AI for a language with little training data." },
  { id: "se_robot_networks", day: "sun", start: "15:00", end: "15:45", venue: "ve_room_3", track: "tr_security", format: "talk", appeal: 0.9, speakers: ["sp_priya", "sp_yerlan"],
    title: "Securing robots on public networks",
    abstract: "Threat modeling for robots that connect over mobile networks, and what an attacker can do with a drone." },
  { id: "se_closing_panel", day: "sun", start: "16:00", end: "17:00", venue: "ve_hall_a", track: "tr_ai", format: "panel", appeal: 2.4, speakers: ["sp_lena", "sp_aigerim", "sp_daniyar", "sp_zarina"],
    title: "Closing panel: what we build next",
    abstract: "Four speakers on the problems worth working on next year, and what this summit changed for them." },
];

/** Organizer changes made before the demo clock starts (shown as row states and in Inbox). */
export const PRIOR_CHANGES = {
  rescheduled: { sessionId: "se_federated_clinics", prevStart: "14:00", prevEnd: "14:45", changedAt: { day: "sat" as DayId, time: "11:11" } },
  canceled: { sessionId: "se_robots_wild", canceledAt: { day: "sat" as DayId, time: "10:20" } },
};
