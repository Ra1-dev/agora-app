<!-- Text extracted from kickoff.pdf for quick reading; the PDF is the source of truth. -->

Computer Science Department 
Senior Project Kickoff Document – Fall 2026 
Title of the project: 
AI-Powered Platform for Events, Conferences and Professional Gatherings 
Team Members: 
Rauan Meiramuly, Ramazan Berik, Taimas Kalym, Raiymbek Issatayev, 
Galymzhan Ayapbergen 
Project Advisor/Co-
Advisors 
Anara Sandygulova, Marat Isteleyev 
Motivation and Summary (20%) 
    This project creates a platform for organizing a large-scale event and for assisting attendees at it. The 
organizers will publish the schedule and track the interactions and interests of participants. Attendees will 
have personalized agendas, recommended sessions, networking opportunities, and announcements 
delivered to them throughout the course of the event. 
• 
The problem to be solved here is that a large-scale conference schedule becomes unmanageable. 
When there are multiple parallel tracks at an event, a participant simply cannot attend all of them, 
and neither a print-out nor a PDF version of a schedule can provide any guidance as to which of two 
interesting presentations one should choose if they happen to overlap. Useful sessions will be missed 
due to strange terminology in the titles, or simply because the participant checks only his or her 
favorite track. The networking is subject to similar pitfalls – a participant will simply talk to those 
who happen to sit at the same table, but fail to notice someone working on a closely-related issue 
during three days. The organizers face the exact opposite challenge – they know how many 
participants attended the conference, but not which tracks attracted them, whether the change of 
room reached the people it affected, or where participants got stuck. Both problems grow with the 
size of the event, and both are handled today with spreadsheets, group chats, printed schedules and 
word of mouth. 
• 
The inputs for the project are of three types. The organizers provide the event information – the event, 
sessions complete with title and abstract, speakers, tracks, location, time, materials and sponsors. The 
participants provide their personal profile information which includes organization details, 
professional and academic interests, skills, biography, networking preferences, and selection of what 
others can see about them on a per-field basis. The system itself gathers the interaction data during 
the course of the event in the form of searches, sessions viewed, bookmarked sessions, check-ins, 
session ratings, voting on polls and sending connection requests. We will use the programs of the 
actual conferences published as input data for sessions. 


• 
The outputs of the system are expected to be a personal agenda with conflict warning, ranking list of 
suggestions for sessions and a brief explanation of why, candidate connections generated on the basis 
of shared profile fields only, communication among those participants who accepted connecting, 
notifications about the changes which are affecting a certain person's agenda, and statistics for 
organizers. The platform has four user groups and the primary user cases are derived from these: A 
participant navigates two concurrent tracks, saves the talks she is interested in and system marks the 
overlaps and assists her in resolving the same. The same person checks out the recommendations 
and discovers three sessions that she didn't check out for before. Prior to the coffee break, two 
attendees who have common interests are presented to each other, linked, and messaged. An 
organizer moves a session to another room, and everyone who saved it is notified and sees an updated 
agenda. After the first day, the organizer checks in the dashboard and notices that one track is 
attracting much less interest than the others. A speaker looks through the questions and ratings left 
on his own session. An administrator sets up a second event on the same installation, and neither 
event can see the other's data. 
• 
•  The kind of solution we envisage is a web application and a mobile client using a single backend 
API, a relational database for events and users' information, as well as a caching layer for frequent 
reads and a notifications layer for live updates. We recommend starting from the text of the current 
session and interests declarations rather than from the behavior of users because the conference does 
not have any interaction history at the start of the first day. This is a system development task, we are 
combining existing approaches to create a solution that will work at a real conference and not invent 
a new algorithm. The Fall semester will be used for defining requirements and developing the design 
of the core screens as well as creating limited prototypes. The implementation of the system will be 
done in Spring. It is not clear yet whether the mobile client will come together with the full participant 
workflow. 
System Description (20%) 
This architecture consists of five components: two client applications, one backend API, a relational database, 
a caching layer, and a recommendation module for ranking sessions and users. Both clients communicate 
exclusively with the API, and no interaction occurs between clients or database independently from the API. 
We intend to develop our web client in React, our mobile client in Flutter, and our API in FastAPI; the 
technologies used on the back-end side include PostgreSQL, Redis, and scikit-learn. We will finalize these 
selections during requirements and design phases following a short integration prototype. 
All requests from both clients will be routed through FastAPI over HTTPS, authenticated, verified regarding 
event membership and role permissions before accessing PostgreSQL. We will make our multi-tenant 
solution explicit: event-specific records will have an event ID, and the authentication/authorization 
processes will ensure that one organizer will be unable to access or modify another event. Redis will provide 
fast access to certain data records without storing data persistently. After modifying the data record and 
creating a notification for it, we will send an update through Redis to WebSocket. Reconnected clients will 
retrieve their notifications from the API. 
We shall model Event, Session, Track, Venue, and Speaker, where sessions have multiple speakers. 
User/Profile and Interest shall be used to define the participants, and event membership for associating a 
user with events. Interaction shall track views, saves, and attendance of users, and SavedSession shall be used 
by users to track their agendas. Connection, Message, and Notification shall be used for networking and 
notifications. Poll/Feedback shall include polls, questions, ratings, and feedback. Schedule validations will 
ensure that time intervals are validated within the time zone of the event. 


 
Figure 1. High-level architecture of the system. 
The TF-IDF vectors will be built from session titles, abstracts, track labels and speaker topic tags. The online 
ranking will compare these vectors to an interest vector with cosine similarity, followed by a small popularity 
prior and filtering out unavailable and saved sessions. For a new event, content and interests will provide the 
cold start solution; if no interests are provided, a track balanced popularity ranking will be suggested. In the 
future, after enough saves and attendances, there might be an optional collaborative recommendation as well. 
Visible and opted in profile information only will be used for potential matches. 
The interaction data will be aggregated in the background and exposed through organizer API on an event 
level as totals. The dashboard will include session and track interaction information, attendance counts, 
ratings and networking counts with date filters. Private messaging content will be excluded and PostgreSQL 
aggregation dates will be indicated. 
This is a rough description. We believe that the requirements in Weeks 6 to 9 will incorporate new 
components that we haven't considered so far and will drop some of the ones described above. The 
requirements as they will appear in the Requirements and Design document will be the ones we will build 
against. 
Hardware and Software Requirements (10%) 


Hardware 
• 
We will use development laptops with an Intel Core i5 or AMD Ryzen 5 processor or better, 16 GB 
RAM and a 512 GB SSD for local containers and builds. 
• 
We will test on Android and iOS devices; iOS builds will need access to a macOS machine with Xcode. 
Stable internet access will be needed for shared services and device testing. 
• 
A staging cloud VM with 4 vCPUs and 8 GB RAM will host the deployed system, subject to available 
funding, with a separate load generator. A university server is our hosting fallback. 
• 
We may use Colab GPU access if we try embedding-based ranking. Our required TF-IDF baseline will 
run on a CPU. 
 
Software 
• 
FastAPI, React and Flutter cover the API and the two clients, with PostgreSQL for durable records and 
Redis plus the FastAPI WebSocket layer for cached state and live delivery. 
• 
Recommendation work needs scikit-learn, pandas, NumPy and Jupyter for text processing, ranking 
prototypes and reproducible offline checks. 
• 
Docker, Git and GitHub with CI give us repeatable builds, pytest and client tests cover correctness, 
and Locust drives the load tests. 
 
•  We will plan work in Jira, design interfaces in Figma, draw architecture in diagrams.net and write 
the course reports in Microsoft Word. 
Evaluation Criteria and Plan (10%) 
The testing process will include testing the event creation by the organizer with parallel sessions, participant 
registration, profile completion, and saving, conflict notifications, and exact search results with the filters 
applied. Tests for sending and accepting the connection invitation, then for messaging will be carried out. The 
rescheduled saved session should reflect in the agenda and notify the participant. The testing process will 
include denying cross-event access and invisible fields. 
The recommendation performance will be evaluated by Precision@K, Recall@K and NDCG@K at K = 5 and 
10 (Järvelin & Kekäläinen, 2002). For our test case, we are considering a conference in a university setting, 
where the number of sessions is expected to be similar to the conference in Astana with 30 sessions per two 
days over four parallel tracks. Interactions will be segmented by time for every user eligible for 
recommendations, while the held-out sessions will not be used for profile formation and session popularity 
will be based on interactions in training only. The content-based module needs to outperform the popularity 
reference module in mean NDCG@5 and NDCG@10 for the same set of users and the same candidate sessions. 
Moreover, the recall should not drop below the reference one as well. We will provide Precision and sample 
size as well.  
Another test will include load testing 15 minutes with 200 concurrent users in the staging environment 
where they're expected to hit the browse, save and profile requests. Our goals are to have a p95 API response 
time less than 300ms, search time under 500ms on 5000 sessions with a failure rate of less than 1 percent of 
requests failing. The delivery of notifications to connected clients will also be monitored separately with our 
goal being under 2 seconds (p95). Resources, size of the data set, and workloads will be logged. 
Approximately 10-15 students and staff will be recruited to take part in a usability test. They will be required 
to schedule a session, save it, resolve a schedule conflict and issue a request to connect. The time required to 
complete each task, assistance used, and any error made will be recorded, followed by administering the 
System Usability Scale (Brooke, 1996). The aim will be at least 90 percent successful task completion without 
assistance and a minimum average SUS score of 70. 


We will develop unit tests for scheduling and prioritization functions, integration tests across the API and the 
database, and acceptance testing connected to the requirement document. Coverage of at least 80 percent for 
the backend code lines will be aimed, boundary testing and authorization failures considered. We will try to 
do a pilot at a campus event; however, access will have to be confirmed. In case that is not available, we will 
do a replay of a past conference schedule in its entirety. 
Risks and Contingency Plans (10%) 
• 
Not enough participants may result in a pilot having no meaning. We will then rerun a published 
programme, this time with a simulated population and then recruit another smaller group for 
usability, which will be labelled as synthetic. 
• 
If there's been no interaction yet, content-based recommendations will be sent and a 
collaborative extension will be delayed until there are real saves/attendance. 
• 
If an improved model fails to outperform the content-based baseline, then the baseline will be 
kept and stated as a comparison. If such baseline is not met by the acceptance check, we will 
adjust its properties and report all deficiencies. 
• 
Scope is the risk we consider most likely. Event and session management, profiles, personal 
schedules, baseline recommendations and search are the must-have core and are protected as 
such in Jira. If we are going to drop some features, per-session group chats, sponsor modules 
and advanced analytics are the first things we are going to drop. 
• 
If WebSocket delivery or concurrency remains unstable, we will use periodic API polling, show 
the last update time and reduce the supported concurrency only with an explicit revised target 
and retest. 
• 
If cloud cost or availability blocks staging, we will use a university server where access is 
available. We can also demonstrate locally in Docker. 
• 
A team member may fall ill or end up overloaded. We reassign Jira tasks weekly for that reason, 
and we pair on everything critical: Rauan and Ramazan on backend and data work, Taimas and 
Raiymbek on the clients, Galymzhan and Rauan on ranking and data preparation. 
• 
If privacy concerns restrict pilot data, we will reduce collection, use per-field visibility and 
explicit consent, and anonymize analytics. We will not import external attendee profiles. We will 
restrict access to identifiable logs and agree a deletion date before recruitment. 


Deliverables (10%) 
Main deliverables include (but are not limited to): 
Fall 2026 
• 
Requirements and Design document, covering the system architecture, the database schema 
and UI wireframes 
• 
Prototype of the core participant workflow: profiles, event and session browsing, search, and a 
personal schedule with conflict detection 
• 
Fall report and presentation 
Spring 2027 
• 
Web platform with event and session management for organizers, on top of the participant 
workflow above 
• 
Content-based session recommendation module 
• 
Participant matching, connection requests and messaging 
• 
Real-time notification service 
• 
Organizer analytics dashboard 
• 
Automated test suite and an evaluation report covering recommendation quality, performance 
and usability 
• 
Deployed system running in Docker, with the source code and technical documentation 
• 
Final report, poster and demonstration 
We will add the following if the core is finished and stable in time, and we prefer to list them separately 
rather than commit to them now: 
• 
Flutter mobile client for the main participant tasks 
• 
Improved recommendation model, compared against the content-based baseline 
• 
Session interaction features: polls, questions, ratings and feedback 
Project Management and Tasking (10%) 
We are going to use Jira to maintain our backlog, assign owners to tasks and document acceptance criteria. 
Weekly meetings are to be held to compare progress and schedule, redistribute workloads and relate finished 
tickets to changes in GitHub. Individual contribution by each participant will be documented for course 
evaluation. 
 
Fall 2026 
Review, requirements and design are to be concentrated on during Fall, and prototype development is 
planned right after the Week 9 submission of design. Figure 2 shows the teaching Weeks 1 to 15 in the 
approximate mid-August – mid-December semester period. The Kick-off, Requirements and Design 
assignments, as well as the Fall report and presentation are due in the Weeks 5, 9, and 14 accordingly. Figure 
2 shows the leaders for each task, however, there are partnerships on the key assignments, which are as 
follows: Rauan and Ramazan are working on backend and data management, Taimas and Raiymbek on the 
clients, and Galymzhan and Rauan on ranking and data processing. 
 


 
Figure 2. Fall 2026 Gantt chart with lead owners and course milestones. 
Spring 2027 (tentative) 
We expect Spring work to run approximately from mid-January to mid-May 2027. We will refine the 
sequence after Fall feedback. 
• 
We will integrate core modules and compare any improved recommendation model with the 
baseline. 
• 
We will implement participant matching, connections and messaging, followed by live 
notifications and session interaction features. 
• 
We will build the organizer analytics dashboard and complete the agreed mobile client 
workflow. 
• 
We will run load tests and the usability study, and attempt a real-event pilot if an organizer 
agrees; otherwise we will replay a published programme. 
• 
•  We will finish deployment, documentation and handover, then prepare the final report, poster 
and demonstration. 
References and Further Reading (10%) 
Adomavicius, G., & Tuzhilin, A. (2005). Toward the next generation of recommender systems: A survey of 
the state-of-the-art and possible extensions. IEEE Transactions on Knowledge and Data Engineering, 
17(6), 734–749. 
Brooke, J. (1996). SUS: A ‘quick and dirty’ usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & 
I. L. McClelland (Eds.), Usability evaluation in industry (pp. 189–194). Taylor & Francis. 
Burke, R. (2002). Hybrid recommender systems: Survey and experiments. User Modeling and User-Adapted 
Interaction, 12, 331–370. 
Dey, A. K. (2001). Understanding and using context. Personal and Ubiquitous Computing, 5, 4–7. 


Järvelin, K., & Kekäläinen, J. (2002). Cumulated gain-based evaluation of IR techniques. ACM Transactions 
on Information Systems, 20(4), 422–446. 
Nielsen, J. (1993). Usability engineering. Academic Press. 
Resnick, P., & Varian, H. R. (1997). Recommender systems. Communications of the ACM, 40(3), 56–58. 
Ricci, F., Rokach, L., & Shapira, B. (Eds.). (2022). Recommender systems handbook (3rd ed.). Springer. 
Terveen, L., & McDonald, D. W. (2005). Social matching: A framework and research agenda. ACM 
Transactions on Computer-Human Interaction, 12(3), 401–434. 
 
