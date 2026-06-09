# MrBytePLC — Industrial Automation Intelligence

Personal website for [@MrBytePLC](https://www.youtube.com/@MrBytePLC)

## File Structure

```
mrbyteplc/
├── index.html                  ← Main homepage
├── README.md
├── pages/
│   └── insights.html           ← STEM insights / blog articles
└── assets/
    ├── css/
    │   ├── main.css            ← Design tokens, nav, responsive, modal, online bar
    │   ├── hero.css            ← Hero section & terminal widget
    │   └── sections.css        ← All page sections + simulator + comments + hall of fame
    └── js/
        └── main.js             ← Full app: videos, simulator, nickname, comments, HOF, likes
```

## Features

- Fully responsive — mobile, tablet, laptop, desktop
- 9 YouTube engineering projects with category filters and modal player
- Interactive conveyor belt + sensor simulator (Canvas)
- Nickname system — users create a nickname to join the community
- Comments section with pending review system
- Hall of Fame leaderboard (likes + comments = points)
- Visit counter and like button
- Online users bar (localStorage-based)
- STEM Insights articles with educational resource references

## Deployment — GitHub Pages

1. Push all files to a public GitHub repo (keep folder structure intact)
2. Go to **Settings → Pages → Deploy from branch → main / root**
3. Your site will be live at `https://YOUR-USERNAME.github.io/REPO-NAME/`

## Future: Firebase Integration

All localStorage logic is already structured to be replaced with Firebase calls:
- `S.get/set` wrappers → swap for Firestore reads/writes
- Heartbeat sessions → Firebase Presence / Realtime Database
- Comments → Firestore collection with admin approval panel

## YouTube Channel

[youtube.com/@MrBytePLC](https://www.youtube.com/@MrBytePLC)

## License

MIT — open source, free to adapt.
