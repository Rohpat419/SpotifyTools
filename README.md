# Spotify Tools

A full-stack application providing Spotify Playlist management and analytics tools that are not available natively in Spotify. 

This project is a successor to [SpotifyTools CLI](https://github.com/Rohpat419/SpotifyTools-CLI). 

**[Live App](https://spotify-tools-xi.vercel.app/)**


## Project Status and the Death of SpotifyTools

SpotifyTools began as a hobby project built around the Spotify Web API and was designed for anyone with a Spotify account. 

In 2026, Spotify significantly restricted access to its Web API for individual developers. Only five authorized users can use the entire suite of this app's features, a new user would require me to un-register an existing user. 

This SpotifyTools app predates these restrictions and currently retains Extended Quota access. Even with this, the application can only be fully functional to 5 registered users which I would manually add to an authorized users list in the Spotify Developers console. 

Because of this, SpotifyTools is effectively feature-complete but shelved. This repo can be cloned or forked, and with some setup, a developer can run this on their local or deploy their own version of the app, register themselves in the Spotify Developer's console, and use the app in its full capacity. 

For more information: 
- [Spotify Development Mode changes](http://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security)
- [Spotify quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)

## Features

### Duplicate Detection
Find duplicate songs in a Spotify playlist using track metadata rather than just the Spotify Track IDs. 

Duplicates are detected based on the following criteria: 
- Track title 
- Artist(s)
- Duration (within a few seconds margin)

Any detected duplicates can be removed directly from the playlist. 

### Explicit Content Filtering
Scans a playlist for explicit content, using either Spotify metadata (fast option) or a scan of each song's lyrics. The lyric scan is slower but more accurate than Spotify metadata. See Katy Perry's Hot N Cold as an example of a song with explicit lyrics that is NOT marked as explicit by Spotify metadata. 

You can then choose to remove tracks from the existing playlist or create a new, clean version of the playlist. 

### Listening Analytics

View your top Spotify tracks and artists over: 
- Last month
- Last 6 months
- Long-term listening history

### Playlist Creation Tool

Utility for building Spotify playlists from your Liked Songs. I find building playlists from my Liked Songs to be wayyyyy too many clicks. 

## Architecture

INSERT ARCH DIAGRAM 

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Deployed on Vercel [Live App](https://spotify-tools-xi.vercel.app/)

### Backend
- Python
- Django REST Framework
- PostgreSQL
- Gunicorn
- Hosted on Render [Ping](https://spotify-tools-eozl.onrender.com/api/debug/ping)

### Integrations
- Spotify Web API
- LRCLIB (lyrics retrieval for explicit content check)
- Purgomalum (for retrieving list of profane words)

## Running Locally

### Prerequisites
- Python 3.11
- Node.js
- pnpm
- Spotify Developer status and access to the Spotify Developer Console. [Start here](https://developer.spotify.com/)

Clone the Repository: 
INSTRUCTIONS FOR CLONING

### Running Backend Locally

Create a Python virtual environment and activate it: 
INSERT COMMAND

Install dependencies: 
INSERT COMMAND

Create a .env containing your Spotify application credentials and the local config. 

INSERT EXAMPLE .ENV HERE

Add this redirect URI to your Spotify Developer application: 
INSERT LINK

Initialize the local DB and start Django: 
INSERT CMDS

SQLite is used locally when there is no configured external database. 

### Running Frontend Locally

From another terminal: 
COMMANDS HERE

Create frontend/.env.local for next.js config, add this line to the file: 
LINE HERE

Start the Development server: 
COMMAND

Open: 
urL HERE

## Current Limitations

## Hosting
- **Frontend:** Hosted on Vercel → [Live App](https://spotify-tools-xi.vercel.app/). Built using [v0](https://v0.app/chat). 
- **Backend:** Hosted on Render → [Health Check](https://spotify-tools-eozl.onrender.com/api/debug/ping). Built with the help of [GPT-5](https://chat.openai.com/).

## Future Steps: 

### UX Improvements

Allow users to choose which duplicate songs to delete instead of deleting all duplicates. This would require an interactive frontend component. 

The Duplicate Deletion tab COULD be replaced by a Duplicate Checker tab with better UX. The user is shown the duplicates and is given a flow to delete the duplicates of their choosing. 

Give users the option to input their own "banned words" list to extend the functionality of the explicit content filter.

Light / dark mode toggle for the frontend. Every developer's favorite feature. Is this done???

Fetching a user's playlists and letting them choose which one to filter for explicit content or find duplicates in. Right now, the user has to input the playlist ID manually. This would display playlists on the frontend, then they would choose the playlist and what tool to apply. 

### New Features

Incorporate more user analytics (other than just Top N Tracks/Artists for a time horizon) but this would require the user to download and upload their data. Since the Spotify Web API does not give an endpoint for this data. 

Build an email notification system to alert users when followed artists release new music. Spotify’s own system is biased toward popular artists so people may not get updates from an artist they listen to unless that artist is popular.

Allow users to prompt an AI to suggest a song/playlist/artist that fits a certain vibe based on the music they already listen to. This would be very difficult since Spotify does not allow developers to send data returned by the Web API to any AI models for ingestion as they may be trained on that data ([Spotify Developer Terms, Section IV: Restrictions](https://developer.spotify.com/terms#section-iv-restrictions)).
The solution to this would be a local GPT model which is quite a bit of work to prepare, train, and host. Spotify has also introduced their own "Prompt a Playlist" feature which would make this feature obsolete but a fun toy project.

### Misc

Conduct a security review of the entire system, patch accordingly. Testing different strings in the input boxes. Seeing if secrets or tokens get leaked at any point. 

## Challenges and Lessons Learned: 
**Spotify API Updates:** As mentioned earlier, the Spotify API being updated to only allow up to 5 users that I manually register to use the app is a major limitation that has effectively killed the app. A dev-lesson here is that dependency on a third-party can go wrong on a whim. In this case, the entire project depended on Spotify so this was unavoiable but a lesson learned nonetheless for industry projects. 

**Spotify OAuth:** The Spotify OAuth flow is a pain. On both the Backend and Frontend. Dealing with the success page on the frontend and the OAuth flow on the Backend was challenging. AI did not do the best here and it took multiple shots and debugging sessions to get this right (more on this later).

**Lack of staging server:** Without a staging server, testing the code was difficult and caused a lot of code pushes instead of local development. This was a bad idea for a project that kept getting iterated on. Having a staging server to see how my code would act in prod without waiting for a deploy would be faster and more aligned with industry practices.

**AI thoughts (and more OAuth):** AI is really good with code that is readily available on the internet, but can struggle with the finer details. This came up while deploying the backend to render, and getting the Spotify OAuth flow working just right. 
- Render issues: AI did not know how to structure the render.yaml to fit my project needs. From having the backend in the backend folder (GPT-5 really wanted everything in the repo root) to environment variable management on render.com to trying to set up Postgres. GPT-5 was fairly unhelpful here. 
- OAuth issues: The Spotify OAuth flow has been a thorn in my side ever since this project's first iteration a few years ago. From the redirect uri to the enforced success page, there were difficulties everywhere. Testing the POC was difficult, getting things right was difficult because of how strict Spotify is (like 127.0.0.1 is ok as a local redirect url but not localhost, which was confusing) .
- More OAuth issues: Converting to prod was also difficult since now there needed to be a redirect to a page on the deployed frontend. The auth flow is still finicky like you can't hit the auth flow from the same browser in succession (within like a minute) or else Spotify will throw an error. 
- All the while, AI (GPT-5) didn't know the fixes for what I was dealing with since the Spotify error messages could mean many different errors (for example: "Invalid URL" being returned after signing in to Spotify, the redirect URL could be wrong OR the redirect URL could be un-registered in the Spotify developer dashboard). It comes down to training data and the Spotify OAuth flow specifically is fairly niche so it makes sense that GPT-5 struggled with it due to a lack of examples in its training data.

**Logging:** Logging is a developer's best friend. I think the less logging I had when dealing with an OAuth issue, the longer it took to debug. Adding more logging statements and try/except blocks were extremely important in debugging the errors. Otherwise, the errors were ridiculously opaque. 
