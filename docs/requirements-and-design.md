<!-- Text extracted from requirements-and-design.pdf for quick reading; the PDF is the source of truth. -->

 
Computer Science Department 
Senior Project Requirements and Design Document – Fall 2026 
 
Title of the 
project: 
 
“AI-Powered Platform for Events, Conferences and Professional 
Gatherings" 
Team Members: 
 
Rauan Meiramuly, Ramazan Berik, Taimas Kalym, Raiymbek 
Issatayev, Galymzhan Ayapbergen 
Project 
Advisor/Co-Advis
ors 
 
Anara Sandygulova, Marat Isteleyev 
Project Overview  (20%) 
Our project is aimed at creating a platform for organizing large scale events and improving the experience 
of participants of such events. The platform allows organizers of events to publish a schedule and track the 
participant interactions. During the event, participants will have recommended sessions, personalized 
agendas, networking opportunities, and necessary announcements shown to them. 
The main motivation behind this platform is that contemporary conferences of such scale are very hard to 
manage because of and not limited to below reasons: 
-​
Participants not being able to attend all of the sessions 
-​
Participants having no guidance provided by the usual schedules that would help them decide 
between two overlapping presentations 
-​
Participants having no better way to manage networking possibilities other than already knowing 
whom they would be interested in networking with, physically looking for those specific people, and 
hoping to find them or be seated near them, all while potentially missing opportunities to network 
with others who worked on issues of interest to them because the platform would not provide any 
assistance in accessing such information. 
-​
Organizers were limited to knowing the number of people attending the conference, without 
knowing which specific track attracted each participant, whether room-change announcements 
reached those affected, or where participants encountered difficulties. 
-​
Above mentioned problems being poorly accounted for in the contemporary solutions such as 
spreadsheets, group chats, printed schedules and verbal communication. 
Our system will be structured around three categories of input data: (1) Event Information, (2) Participant 
Profile Information, and (3) Interaction Data. Based on these inputs, the system provides six primary 
outputs: (1) Personalized Agendas, (2) Session Recommendations, (3) Networking Recommendations, (4) 
Participant Communication, (5) Event Notifications, and (6) Organizer Analytics.  
For this project we will not be inventing a new systematic solution, rather we will be combining existing 
approaches to create a solution that will work at a real conference.  


More specifically, in our project we plan to develop a: 
-​
Web Application and a Mobile Client which uses a single backend API. 
-​
Relational database for events and user information 
-​
Caching layer for frequent reads 
-​
Notification layer for live updates 
Requirements (30%) 
Functional requirements 
 
ID 
Requirement 
FR-01 
Users shall be able to create an account, sign in and sign out. 
FR-02 
The system shall restrict user operations according to their membership and assigned role 
within an event. 
FR-03 
Users shall not be able to access or modify data belonging to events they are not members of 
unless they have been granted the required permissions. 
FR-04 
An authorized administrator shall be able to create events and assign an organizer to each 
event. 
FR-05 
Event organizers shall be able to update event information and add, edit or delete sessions, 
tracks, venues, speakers and links to event materials. 
FR-06 
Event organizers shall be able to publish, reschedule and cancel sessions. Participants shall be 
able to see the current status of each session. 
FR-07 
Event organizers shall be able to create and publish announcements for participants in their 
events. 
FR-08 
Participants shall be able to maintain their organization, interests, skills, biography and 
networking preferences in their profiles. 
FR-09 
The system shall apply participants' visibility settings to profile fields when other participants 
search for or view their profiles or receive explanations for suggested matches. 
FR-10 
Participants shall be able to browse and search sessions, speakers, topics, other visible 
participants, organizations and event materials within their event. 
FR-11 
The system shall allow participants to filter sessions by date and track and sort the results by 
start time or search relevance. 


FR-12 
Participants shall be able to save sessions to their agendas, remove them and view saved 
sessions in chronological order. 
FR-13 
The system shall identify overlapping sessions in a participant's agenda and allow the 
participant to resolve conflicts by removing a saved session. 
FR-14 
The system shall rank relevant sessions based on participants' declared interests and session 
content. Each recommendation shall include a brief explanation. 
FR-15 
If a participant has no usable interest profile, the system shall recommend popular sessions 
while maintaining a balance across event tracks. 
FR-16 
The system shall suggest other participants who have opted into networking. Suggestions 
shall use only profile fields that those participants have made visible to other attendees. 
FR-17 
Participants shall be able to send, accept and reject connection requests within an event. 
FR-18 
After a connection is accepted, both participants shall be able to exchange messages and 
retrieve their conversation. 
FR-19 
The system shall record session views, saves and participant check-ins as separate interaction 
types, subject to the applicable permissions. 
FR-20 
The system shall notify affected users about changes to saved sessions, upcoming sessions, 
new messages, connection requests and organizer announcements. 
FR-21 
The system shall store notifications and retrieve missed notifications when a client 
reconnects. 
FR-22 
The system shall present organizer analytics for registrations, views, saves, check-ins and 
networking activity with event, session, track and time filters. 
Non-functional requirements 
 
ID 
Requirement 
NFR-01 
During a 15-minute test with 200 concurrent users, the p95 response time for browse, save 
and profile requests shall remain below 300 ms, with a failed-request rate below 1%. 
NFR-02 
For a database containing 5,000 sessions, the p95 search response time shall be below 500 
ms. 
NFR-03 
The system shall deliver live notifications to connected clients within 2 seconds at p95. 


NFR-04 
The system shall use HTTPS for network connections, secure password hashing for stored 
passwords, and server-side checks for event membership and permissions. 
NFR-05 
Saved agendas, messages and notifications shall remain available after an application restart 
or cache failure. 
NFR-06 
In usability testing with approximately 10–15 students and staff, at least 90% of tasks shall be 
completed without assistance, and the average System Usability Scale (SUS) score shall be at 
least 70. 
NFR-07 
Automated backend tests shall cover at least 80% of executable code lines and include 
boundary cases for scheduling and access-denial scenarios. 
NFR-08 
Data collected for personal evaluation shall be gathered with participants' consent, accessed 
only by authorized team members and deleted on an agreed date. 
Domain requirements 
 
ID 
Requirement 
DR-01 
Each event shall have its own sessions, memberships and permissions. Membership or access 
rights for one event shall not grant access to another event. 
DR-02 
Each session shall start before it ends and take place within the event dates. Session times 
shall be displayed in the event's time zone. 
DR-03 
Two saved sessions shall be considered conflicting if their time intervals overlap. Sessions 
where one ends exactly when the other begins shall not be treated as conflicting. 
DR-04 
Saving a session shall indicate a participant's interest but shall not reserve a seat or confirm 
attendance. Session views, saves and check-ins shall be recorded separately. 
DR-05 
Participant matching shall use only visible profile fields and require current consent to 
networking. Messaging shall be available only between participants with an accepted 
connection in the same event. 
DR-06 
Organizer analytics shall present aggregated statistics and shall not include the contents of 
private messages. 
 
Preliminary Design (20%) 
List of stakeholders: 


Participants (browse/search sessions, network with other participants and manage their personal agendas) 
Organizers (control the event status, send announcements to participants, receive and review event 
statistics) 
Speakers (provide event session information) 
Administrators (create events and assign Organizers for the events) 
Our team of five members (develop and test the platform) 
Anara Sandygulova and Marat Isteleyev (advise the team during the development process) 
(NU students and staff will participate in platform’s usability testing) 
 
Structured use cases 
UC-01  Creating/editing a profile 
Actor: Participant 
Precondition: The user is signed in and wishes to create a profile or edit an existing profile. 
Main steps: Participant fills in the fields (such as interests, professional details, etc.) and uses visibility 
options to change which fields are visible to other users. 
Exceptions: If the fields were filled incorrectly they will be underlined and a message describing the issue 
appears near the field. (like the improper email structure checking for ‘@’, ‘.’ and password’s length and 
character limitations) 
Result: The profile is created and the edits are saved. Other users see the fields that were chosen to be 
visible. 
 
UC-02  Build a personal agenda 
Actor: Participant 
Precondition: The participant is registered for an event where the organizer has already published the even 
sessions for the participant to browse. 
Main steps: The participant searches or browses the event sessions, selects a session and opens session 
details (e.g. title, speaker, time, location and abstract), then by saving the session adds it to their personal 


agenda. Saved sessions appear on the participant’s schedule and in case two session times overlap, the 
system warns the participant.  The participant then can resolve the warning by removing one of the 
overlapping sessions. 
Exceptions: In case one session has been saved twice no duplicate saves are created. In case organizers 
cancel a session and it was not previously saved by the participant, that session cannot be saved by the 
participant. In case it was saved prior to cancellation, the session’s status will be changed and affected 
participants will be notified. 
Result: The updated personal agenda with saved sessions persists after reload. 
 
UC-03  View session recommendations 
Actor: Participant 
Precondition: The participant is registered for an event where the organizer has already published the even 
sessions that could be recommended to the participant . 
Main steps: The system checks the participant’s interests, compares those interests with the session 
information  (e.g. titles, abstracts, track labels, and speaker topic tags), ranks the sessions according to their 
relevancy to the  participant’s interests, and creates a ranked recommendation list with short explanations 
about why it was recommended. The participant then can choose to open the recommended session from 
the list and save it to their personal agenda. 
Exceptions: In case participant has not provided information about their interests, recommendation list will 
show the popular sessions across different tracks (e.g. AI track, Security track, HCI track). If no sessions are 
available to the participant, the recommendation list will show an empty result with a message “No sessions 
are currently available for recommendation.” 
Result: The participant is provided with a personalized recommendation list based on their interests,  
popularity-based recommendation list if the interests were not specified,  and an empty list if no sessions 
are available. 
 
UC-04  Connect and send a message 
Actor: Two participants 
Precondition: Two participants are registered for the same event, the recipient participant has networking 
enabled in their profile settings, the sender participant is authorized to send connection requests within 
that event. 


Main steps: Participant A sends a connection request to a recipient participant B. Participant B either 
accepts or rejects the received request. If accepted messaging between participants is enabled, if rejected 
messaging is blocked. 
Exceptions: Other users cannot see the private messages between Participant A and Participant B. If the 
request is pending the messaging is not allowed. 
Result: The system records an accepted connection between two participants, messages exchanged 
between them are stored, and the conversation can be accessed by either participant returning to the 
platform. 
 
UC-05  Change a session 
Actor: Organizer 
Precondition: The organizer is assigned to particular event A by the administrator. 
Main steps: The organizer opens the existing session within the event A and changed its scheduled time and 
location, the system checks the validity of changes being made by the organizer (e.g. the session must start 
before it ends and remain within the event dates). If the changes are valid, the system saves them into the 
database, updates personal agendas containing the newly modified  session, and notifies the affected 
participants. 
Exceptions: In case of invalid changes, changes are rejected by the system. In case of valid changes, the 
affected participants that were offline at the time when changes were made will receive the notifications 
upon reconnecting to the platform. 
Result: The event session displays the updated time or location. Participants who saved the session prior to 
the changes will see its updated details in their personal agendas and will receive a notification about the 
changes once they are reconnected to the platform. 
 
UC-06  Review event activity 
Actor: Organizer 
Precondition: The organizer is assigned to particular event A by the administrator and therefore has access 
to the event A statistics. 
Main steps: The organizer opens the dashboard where the system displays an overview of participant 
activity. The organizer can see the number of registrations, session views, saves, check-ins, networking 
activities, and select filters that narrow the displayed statistics. (e.g. to a particular session, track, or time 


period.) The system retrieves the data using the relevant information (e.g. previously collected information 
about registrations and participant activities.) 
Exceptions: In case of filter selecting a time period where no interactions were recorded, the system 
displays a statistics with zero activity records. The system denies organizer’s request to event statistics 
belonging to the events they were not authorized for. 
Result: The organizer sees statistics representing groups of interactions and the time indication of how 
recent the displayed statistics are. (e.g. Last Updated: date, time) 
Sequence diagrams 
 
Figure 1. Saving a session and checking the agenda for conflicts. Source: Made using Visual Paradigm Online. 


 
Figure 2. Updating a session and notifying affected participants. Source: Made using Visual Paradigm Online. 
System architecture 
The Web Client communicates with the shared Backend API. The Backend API checks user permissions and 
handles event management, search, agendas, recommendations, networking and analytics. PostgreSQL 
stores the permanent data. Redis supports caching and live updates.  
Notifications are stored in PostgreSQL before live delivery so disconnected users can retrieve them later. A 
Background Worker retrieves stored notifications and delivers them without creating duplicate 
notifications. The system will be deployed with Docker on a cloud or university server with local 
deployment available for demonstrations. 


 
Figure 3. Preliminary system architecture. Source: Made using Visual Paradigm Online. 


 
Figure 4. Preliminary browse screen. Source: Generated using ChatGPT Images (OpenAI, 2026). 
 
Figure 5. Preliminary agenda screen.  Source: Generated using ChatGPT Images (OpenAI, 2026). 


 
Figure 6. Preliminary profile screens  Source: Generated using ChatGPT Images (OpenAI, 2026). 
 


 
Figure 7. Preliminary event analytics screens (signed in as Organizer)  Source: Generated using ChatGPT 
Images (OpenAI, 2026). 
 
High-level tasking plans (20%) 
We will manage tasks and owners in Jira, keep code and reviews in GitHub, and use Figma for interface 
design. We will hold weekly in-person or online (Discord, Microsoft Teams) meetings for assigning tasks, 
reviewing current progress and other relevant discussions. 
 
Fall 2026 responsibilities 
 
Rauan Meiramuly — Backend and database design, recommendation module planning,  data preparation. 
 
Ramazan Berik — Backend development, database design and management. 
 
Taimas Kalym — Client interface design and development of participant workflow together with Raiymbek. 
 
Raiymbek Issatayev — Client interface design and development of participant workflow together with 
Taimas. 
 
Galymzhan Ayapbergen — Recommendation module design, ranking methods, data preparation together 
with Rauan. 


 
Spring 2027 plan 
In Spring 2027 we plan to implement the main system components: event management, participant 
networking, messaging, notifications, organizer analytics. We will also complete the recommendation 
module, evaluate its performance and, optionally, develop the mobile client if time allows. Then, we will 
conduct performance and usability testing, deploy the system, and at the end, prepare the final report and 
demonstration. 
Conclusion (10%) 
By the end of Fall semester we plan to complete the following: 
-​
Have a working demo of the AI-Powered Platform for Events, Conferences and Professional 
Gatherings. 
-​
Limited prototype covering participant profiles, event and session browsing, search, and personal 
agendas with conflict detection. 
-​
Requirements and Design document. 
-​
Project documentation. 
-​
Fall semester report. 
-​
Fall semester presentation. 
 
